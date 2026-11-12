import rawCourse from '@/data/course.json';

import { flattenCourse } from '../course';
import { computePathLayout } from '../pathLayout';
import {
  completeLesson,
  dateKey,
  emptyProgress,
  getCourseStats,
  getItemStatuses,
  getLevel,
  getStreak,
  getTotalXp,
  getWeeklyXp,
  isQuizPassed,
  isWatchedEnough,
  recordQuizAttempt,
  sanitizeProgress,
} from '../progress';
import type { CourseData, ProgressState, Quiz } from '../types';
import { formatTime, getYouTubeId } from '../video';

const courseData = rawCourse as CourseData;
const items = flattenCourse(courseData);
const NOW = new Date(2026, 10, 6, 12);
const unit1 = courseData.units[0];
const unit2 = courseData.units[1];

function finishUnit1Lessons(): ProgressState {
  return unit1.lessons.reduce((state, lesson) => completeLesson(state, lesson.id, NOW).state, emptyProgress);
}

describe('course content', () => {
  const playable = courseData.units.filter((unit) => !unit.comingSoon);

  it('has 2 playable units of 5 lessons and a quiz, plus a locked third', () => {
    expect(playable).toHaveLength(2);
    expect(courseData.units[2].comingSoon).toBe(true);
    for (const unit of playable) expect(unit.lessons).toHaveLength(5);
  });

  it('has 3-5 questions per quiz, 3 options each and a valid answer', () => {
    for (const unit of playable) {
      expect(unit.quiz.questions.length).toBeGreaterThanOrEqual(3);
      expect(unit.quiz.questions.length).toBeLessThanOrEqual(5);
      for (const question of unit.quiz.questions) {
        expect(question.options).toHaveLength(3);
        expect(question.options[question.answerIndex]).toBeDefined();
      }
    }
  });

  it('uses unique ids', () => {
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getItemStatuses', () => {
  it('starts with only the first lesson active', () => {
    const statuses = getItemStatuses(items, emptyProgress);
    expect(statuses['u1-l1']).toBe('active');
    expect(statuses['u1-l2']).toBe('locked');
    expect(statuses['u1-quiz']).toBe('locked');
  });

  it('unlocks the next lesson after completing one', () => {
    const { state } = completeLesson(emptyProgress, 'u1-l1', NOW);
    const statuses = getItemStatuses(items, state);
    expect(statuses['u1-l1']).toBe('completed');
    expect(statuses['u1-l2']).toBe('active');
  });

  it('opens the quiz after all 5 lessons, and unit 2 only after passing it', () => {
    let state = finishUnit1Lessons();
    expect(getItemStatuses(items, state)['u1-quiz']).toBe('active');
    expect(getItemStatuses(items, state)['u2-l1']).toBe('locked');

    state = recordQuizAttempt(state, unit1.quiz, 2, NOW).state;
    expect(getItemStatuses(items, state)['u1-quiz']).toBe('active');
    expect(getItemStatuses(items, state)['u2-l1']).toBe('locked');

    state = recordQuizAttempt(state, unit1.quiz, 3, NOW).state;
    expect(getItemStatuses(items, state)['u1-quiz']).toBe('completed');
    expect(getItemStatuses(items, state)['u2-l1']).toBe('active');
  });

  it('never makes a coming-soon unit active, even with everything finished', () => {
    let state = emptyProgress;
    for (const unit of [unit1, unit2]) {
      for (const lesson of unit.lessons) state = completeLesson(state, lesson.id, NOW).state;
      state = recordQuizAttempt(state, unit.quiz, unit.quiz.questions.length, NOW).state;
    }
    const statuses = getItemStatuses(items, state);
    expect(statuses['u3-l1']).toBe('locked');
    expect(Object.values(statuses)).not.toContain('active');
    expect(getCourseStats(courseData, state).percent).toBe(100);
  });
});

describe('rules', () => {
  it('requires 90% of the video before finishing', () => {
    expect(isWatchedEnough(8.9, 10)).toBe(false);
    expect(isWatchedEnough(9, 10)).toBe(true);
    expect(isWatchedEnough(0, 0)).toBe(false);
  });

  it('passes at exactly 60%', () => {
    expect(isQuizPassed(3, 5, 60)).toBe(true);
    expect(isQuizPassed(2, 5, 60)).toBe(false);
    expect(isQuizPassed(2, 4, 60)).toBe(false);
    expect(isQuizPassed(3, 4, 60)).toBe(true);
    expect(isQuizPassed(0, 0, 60)).toBe(false);
  });
});

describe('xp', () => {
  const quiz: Quiz = unit1.quiz;

  it('pays lesson XP only once', () => {
    const first = completeLesson(emptyProgress, 'u1-l1', NOW);
    const second = completeLesson(first.state, 'u1-l1', NOW);
    expect(first.xpEarned).toBe(10);
    expect(second.xpEarned).toBe(0);
    expect(getTotalXp(second.state)).toBe(10);
  });

  it('pays nothing for a failed quiz', () => {
    const attempt = recordQuizAttempt(emptyProgress, quiz, 2, NOW);
    expect(attempt.passed).toBe(false);
    expect(attempt.xpEarned).toBe(0);
  });

  it('pays only the improvement on a retake', () => {
    const first = recordQuizAttempt(emptyProgress, quiz, 3, NOW);
    const same = recordQuizAttempt(first.state, quiz, 3, NOW);
    const better = recordQuizAttempt(same.state, quiz, 5, NOW);
    expect([first.xpEarned, same.xpEarned, better.xpEarned]).toEqual([15, 0, 10]);
    expect(getTotalXp(better.state)).toBe(25);
    expect(better.state.quizResults[quiz.id].attempts).toBe(3);
  });

  it('keeps a pass and the best score after a worse retake', () => {
    const passed = recordQuizAttempt(emptyProgress, quiz, 4, NOW);
    const worse = recordQuizAttempt(passed.state, quiz, 1, NOW);
    expect(worse.passed).toBe(false);
    expect(worse.state.quizResults[quiz.id]).toMatchObject({ passed: true, bestCorrect: 4, xpAwarded: 20 });
  });

  it('derives the level from XP', () => {
    expect(getLevel(0)).toMatchObject({ level: 1, xpIntoLevel: 0 });
    expect(getLevel(49)).toMatchObject({ level: 1, xpIntoLevel: 49 });
    expect(getLevel(50)).toMatchObject({ level: 2, xpIntoLevel: 0 });
  });
});

describe('course stats', () => {
  it('counts lessons and quizzes toward the percent, excluding coming-soon units', () => {
    let state = finishUnit1Lessons();
    expect(getCourseStats(courseData, state)).toMatchObject({
      lessonsDone: 5,
      lessonsTotal: 10,
      percent: 42,
    });
    state = recordQuizAttempt(state, unit1.quiz, 4, NOW).state;
    expect(getCourseStats(courseData, state)).toMatchObject({
      quizzesPassed: 1,
      quizzesTotal: 2,
      percent: 50,
    });
  });

  it('averages the best score per attempted quiz, or null with no attempts', () => {
    expect(getCourseStats(courseData, emptyProgress).averageQuizPercent).toBeNull();
    let state = recordQuizAttempt(emptyProgress, unit1.quiz, 4, NOW).state; // 80%
    state = recordQuizAttempt(state, unit2.quiz, 4, NOW).state; // 100%
    expect(getCourseStats(courseData, state).averageQuizPercent).toBe(90);
  });

  it('survives a course with no playable units', () => {
    const empty: CourseData = { ...courseData, units: [] };
    expect(getCourseStats(empty, emptyProgress).percent).toBe(0);
  });
});

describe('streak and weekly activity', () => {
  const day = (offset: number) => dateKey(new Date(2026, 10, 6 + offset));

  it('counts consecutive days', () => {
    expect(getStreak({}, NOW)).toBe(0);
    expect(getStreak({ [day(0)]: 10, [day(-1)]: 10, [day(-3)]: 10 }, NOW)).toBe(2);
  });

  it('stays alive until today ends', () => {
    expect(getStreak({ [day(-1)]: 10, [day(-2)]: 10 }, NOW)).toBe(2);
    expect(getStreak({ [day(-2)]: 10 }, NOW)).toBe(0);
  });

  it('crosses month boundaries', () => {
    const firstOfMonth = new Date(2026, 10, 1, 12);
    expect(getStreak({ '2026-11-01': 5, '2026-10-31': 5 }, firstOfMonth)).toBe(2);
  });

  it('lists the last 7 days ending today', () => {
    const week = getWeeklyXp({ [day(0)]: 20, [day(-6)]: 5, [day(-7)]: 99 }, NOW);
    expect(week.map((entry) => entry.xp)).toEqual([5, 0, 0, 0, 0, 0, 20]);
    expect(week[6].isToday).toBe(true);
  });
});

describe('sanitizeProgress', () => {
  it('returns empty progress for garbage', () => {
    for (const garbage of [null, 'x', 7, []]) expect(sanitizeProgress(garbage)).toEqual(emptyProgress);
  });

  it('keeps valid fields and drops malformed ones', () => {
    const result = sanitizeProgress({
      completedLessons: ['u1-l1', 5],
      quizResults: {
        good: { bestCorrect: 3, total: 5, passed: true, xpAwarded: 15, attempts: 1 },
        zeroTotal: { bestCorrect: 0, total: 0, passed: false, xpAwarded: 0, attempts: 1 },
        bad: { passed: 'yes' },
      },
      xpByDay: { '2026-11-06': 10, '2026-11-05': 'many', '2026-11-04': -3 },
    });
    expect(result.completedLessons).toEqual(['u1-l1']);
    expect(Object.keys(result.quizResults)).toEqual(['good']);
    expect(result.xpByDay).toEqual({ '2026-11-06': 10 });
  });
});

describe('getYouTubeId', () => {
  it.each([
    'https://www.youtube.com/watch?v=CilH8QDYJyQ',
    'https://m.youtube.com/watch?pp=abc&v=CilH8QDYJyQ',
    'https://youtu.be/CilH8QDYJyQ?t=5',
    'https://www.youtube.com/embed/CilH8QDYJyQ',
    'https://www.youtube.com/shorts/CilH8QDYJyQ',
  ])('reads the id from %s', (url) => {
    expect(getYouTubeId(url)).toBe('CilH8QDYJyQ');
  });

  it('returns null for video files and empty urls', () => {
    expect(getYouTubeId('https://example.com/lesson1.mp4')).toBeNull();
    expect(getYouTubeId('')).toBeNull();
  });

  it('finds a video id in every playable lesson', () => {
    for (const unit of courseData.units.filter(({ comingSoon }) => !comingSoon)) {
      for (const lesson of unit.lessons) expect(getYouTubeId(lesson.videoUrl)).not.toBeNull();
    }
  });
});

describe('formatTime', () => {
  it('shows minutes and padded seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75.9)).toBe('1:15');
    expect(formatTime(261)).toBe('4:21');
  });

  it('never shows a negative time', () => {
    expect(formatTime(-3)).toBe('0:00');
  });
});

describe('computePathLayout', () => {
  it.each([280, 360, 430, 520])('keeps a 96px-wide stop on screen at width %i', (width) => {
    const { nodes, height } = computePathLayout(items, width);
    expect(nodes).toHaveLength(items.length);
    for (const node of nodes) {
      expect(node.x - 48).toBeGreaterThanOrEqual(0);
      expect(node.x + 48).toBeLessThanOrEqual(width);
      expect(node.y).toBeLessThan(height);
    }
  });
});
