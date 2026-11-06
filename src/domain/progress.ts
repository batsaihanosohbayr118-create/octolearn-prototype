import type { CourseData, ItemStatus, PathItem, ProgressState, Quiz } from './types';

export const LESSON_XP = 10;
export const XP_PER_CORRECT_ANSWER = 5;
export const XP_PER_LEVEL = 50;
/** A lesson can be finished once this share of the video has been reached. */
export const WATCHED_THRESHOLD = 0.9;

export const emptyProgress: ProgressState = {
  completedLessons: [],
  quizResults: {},
  xpByDay: {},
};

/** Local calendar date, so a streak follows the learner's day rather than UTC. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isItemCompleted(item: PathItem, progress: ProgressState): boolean {
  return item.kind === 'lesson'
    ? progress.completedLessons.includes(item.id)
    : progress.quizResults[item.id]?.passed === true;
}

/**
 * The first unfinished item of a playable unit is active. Everything after it is
 * locked, as is every item of a coming-soon unit.
 */
export function getItemStatuses(items: PathItem[], progress: ProgressState): Record<string, ItemStatus> {
  const statuses: Record<string, ItemStatus> = {};
  let activeAssigned = false;
  for (const item of items) {
    if (item.unit.comingSoon) {
      statuses[item.id] = 'locked';
    } else if (isItemCompleted(item, progress)) {
      statuses[item.id] = 'completed';
    } else if (!activeAssigned) {
      statuses[item.id] = 'active';
      activeAssigned = true;
    } else {
      statuses[item.id] = 'locked';
    }
  }
  return statuses;
}

export function isWatchedEnough(currentTime: number, duration: number): boolean {
  return duration > 0 && currentTime / duration >= WATCHED_THRESHOLD;
}

export function isQuizPassed(correct: number, total: number, passPercent: number): boolean {
  // Compared in integers so that 3/5 against 60% cannot fail on float rounding.
  return total > 0 && correct * 100 >= passPercent * total;
}

function addXp(xpByDay: Record<string, number>, now: Date, xp: number) {
  if (xp <= 0) return xpByDay;
  const key = dateKey(now);
  return { ...xpByDay, [key]: (xpByDay[key] ?? 0) + xp };
}

export function completeLesson(state: ProgressState, lessonId: string, now: Date) {
  if (state.completedLessons.includes(lessonId)) {
    return { state, xpEarned: 0 };
  }
  return {
    state: {
      ...state,
      completedLessons: [...state.completedLessons, lessonId],
      xpByDay: addXp(state.xpByDay, now, LESSON_XP),
    },
    xpEarned: LESSON_XP,
  };
}

/**
 * Records a quiz attempt. Only a passing attempt pays XP and a retake only pays
 * the improvement, so repeating a quiz can't farm points. A later failure never
 * takes away a pass.
 */
export function recordQuizAttempt(state: ProgressState, quiz: Quiz, correct: number, now: Date) {
  const total = quiz.questions.length;
  const passedNow = isQuizPassed(correct, total, quiz.passPercent);
  const previous = state.quizResults[quiz.id];
  const previousXp = previous?.xpAwarded ?? 0;
  const xpEarned = passedNow ? Math.max(0, correct * XP_PER_CORRECT_ANSWER - previousXp) : 0;

  return {
    state: {
      ...state,
      quizResults: {
        ...state.quizResults,
        [quiz.id]: {
          bestCorrect: Math.max(previous?.bestCorrect ?? 0, correct),
          total,
          passed: passedNow || previous?.passed === true,
          xpAwarded: previousXp + xpEarned,
          attempts: (previous?.attempts ?? 0) + 1,
        },
      },
      xpByDay: addXp(state.xpByDay, now, xpEarned),
    },
    xpEarned,
    passed: passedNow,
  };
}

export function getTotalXp(progress: ProgressState): number {
  return Object.values(progress.xpByDay).reduce((sum, xp) => sum + xp, 0);
}

export function getLevel(totalXp: number) {
  return {
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    xpIntoLevel: totalXp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
  };
}

/** Consecutive days with XP, ending today, or yesterday if today has no XP yet. */
export function getStreak(xpByDay: Record<string, number>, now: Date): number {
  const hasXp = (date: Date) => (xpByDay[dateKey(date)] ?? 0) > 0;
  let cursor = hasXp(now) ? now : addDays(now, -1);
  let streak = 0;
  while (hasXp(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Last seven days, oldest first. */
export function getWeeklyXp(xpByDay: Record<string, number>, now: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(now, index - 6);
    return { date, xp: xpByDay[dateKey(date)] ?? 0, isToday: index === 6 };
  });
}

/** Course stats cover playable units only; coming-soon units are not part of the 100%. */
export function getCourseStats(data: CourseData, progress: ProgressState) {
  const units = data.units.filter((unit) => !unit.comingSoon);
  const lessonIds = units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id));
  const quizzes = units.map((unit) => unit.quiz);

  const lessonsDone = lessonIds.filter((id) => progress.completedLessons.includes(id)).length;
  const quizzesPassed = quizzes.filter((quiz) => progress.quizResults[quiz.id]?.passed).length;
  const totalSteps = lessonIds.length + quizzes.length;

  const attempted = quizzes.flatMap((quiz) => progress.quizResults[quiz.id] ?? []);
  const averageQuizPercent = attempted.length
    ? Math.round(
        attempted.reduce((sum, result) => sum + (result.bestCorrect / result.total) * 100, 0) /
          attempted.length,
      )
    : null;

  return {
    lessonsDone,
    lessonsTotal: lessonIds.length,
    quizzesPassed,
    quizzesTotal: quizzes.length,
    percent: totalSteps ? Math.round(((lessonsDone + quizzesPassed) / totalSteps) * 100) : 0,
    averageQuizPercent,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Saved data can be stale or corrupt; anything malformed falls back to empty, not a crash. */
export function sanitizeProgress(saved: unknown): ProgressState {
  if (!isRecord(saved)) return emptyProgress;

  const completedLessons = Array.isArray(saved.completedLessons)
    ? saved.completedLessons.filter((id): id is string => typeof id === 'string')
    : [];

  const quizResults: ProgressState['quizResults'] = {};
  if (isRecord(saved.quizResults)) {
    for (const [id, result] of Object.entries(saved.quizResults)) {
      if (
        isRecord(result) &&
        typeof result.bestCorrect === 'number' &&
        typeof result.total === 'number' &&
        result.total > 0 &&
        typeof result.passed === 'boolean' &&
        typeof result.xpAwarded === 'number' &&
        typeof result.attempts === 'number'
      ) {
        quizResults[id] = {
          bestCorrect: result.bestCorrect,
          total: result.total,
          passed: result.passed,
          xpAwarded: result.xpAwarded,
          attempts: result.attempts,
        };
      }
    }
  }

  const xpByDay: ProgressState['xpByDay'] = {};
  if (isRecord(saved.xpByDay)) {
    for (const [day, xp] of Object.entries(saved.xpByDay)) {
      if (typeof xp === 'number' && Number.isFinite(xp) && xp > 0) xpByDay[day] = xp;
    }
  }

  return { completedLessons, quizResults, xpByDay };
}
