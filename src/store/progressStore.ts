import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { database } from '@/db/database';
import {
  completeLesson,
  dateKey,
  emptyProgress,
  getLevel,
  getTotalXp,
  recordQuizAttempt,
} from '@/domain/progress';
import type { ProgressState, Quiz } from '@/domain/types';

import { useCourseStore } from './courseStore';

export type Reward = {
  xpEarned: number;
  /** The new level, when this reward crossed a level boundary. */
  levelUpTo: number | null;
};

type ProgressStore = ProgressState & {
  /** True once the database has been read, whether or not that succeeded. */
  hydrated: boolean;
  completeLesson: (lessonId: string) => Reward;
  submitQuiz: (quiz: Quiz, correct: number) => Reward & { passed: boolean };
  reset: () => void;
};

function pickProgress({ completedLessons, quizResults, xpByDay }: ProgressState): ProgressState {
  return { completedLessons, quizResults, xpByDay };
}

function levelUp(before: ProgressState, after: ProgressState): number | null {
  const previous = getLevel(getTotalXp(before)).level;
  const next = getLevel(getTotalXp(after)).level;
  return next > previous ? next : null;
}

/**
 * The UI reads and updates this store straight away; each change is then
 * written to the database in the background.
 */
export const useProgressStore = create<ProgressStore>()((set, get) => ({
  ...emptyProgress,
  hydrated: false,

  completeLesson: (lessonId) => {
    const now = new Date();
    const before = pickProgress(get());
    const { state, xpEarned } = completeLesson(before, lessonId, now);
    set(state);
    if (state !== before) void database.completeLesson(lessonId, dateKey(now), xpEarned);
    return { xpEarned, levelUpTo: levelUp(before, state) };
  },

  submitQuiz: (quiz, correct) => {
    const now = new Date();
    const before = pickProgress(get());
    const { state, xpEarned, passed } = recordQuizAttempt(before, quiz, correct, now);
    set(state);
    void database.saveQuizResult(quiz.id, state.quizResults[quiz.id], dateKey(now), xpEarned);
    return { xpEarned, passed, levelUpTo: levelUp(before, state) };
  },

  reset: () => {
    set(emptyProgress);
    void database.clearProgress();
  },
}));

let loading: Promise<void> | null = null;

/** Reads the course and progress from the database into the stores. Safe to call more than once. */
export function loadDatabase() {
  loading ??= database
    .load()
    .then(({ courseData, progress }) => {
      useCourseStore.getState().setCourse(courseData);
      useProgressStore.setState(progress);
    })
    .catch((error: unknown) => {
      // The app still runs on the bundled course; progress just won't persist this session.
      console.warn('Could not open the database:', error);
    })
    .finally(() => useProgressStore.setState({ hydrated: true }));
  return loading;
}

export function useProgress(): ProgressState {
  return useProgressStore(useShallow(pickProgress));
}
