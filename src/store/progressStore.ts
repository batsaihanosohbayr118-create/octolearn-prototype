import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { completeLesson, emptyProgress, getLevel, getTotalXp, recordQuizAttempt, sanitizeProgress } from '@/domain/progress';
import type { ProgressState, Quiz } from '@/domain/types';

export type Reward = {
  xpEarned: number;
  /** The new level, when this reward crossed a level boundary. */
  levelUpTo: number | null;
};

type ProgressStore = ProgressState & {
  /** True once saved progress has been read, whether or not that succeeded. */
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

export const useProgressStore = create<ProgressStore>()(
  persist<ProgressStore, [], [], ProgressState>(
    (set, get) => ({
      ...emptyProgress,
      hydrated: false,

      completeLesson: (lessonId) => {
        const before = pickProgress(get());
        const { state, xpEarned } = completeLesson(before, lessonId, new Date());
        set(state);
        return { xpEarned, levelUpTo: levelUp(before, state) };
      },

      submitQuiz: (quiz, correct) => {
        const before = pickProgress(get());
        const { state, xpEarned, passed } = recordQuizAttempt(before, quiz, correct, new Date());
        set(state);
        return { xpEarned, passed, levelUpTo: levelUp(before, state) };
      },

      reset: () => set(emptyProgress),
    }),
    {
      name: 'octolearn-progress',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: pickProgress,
      merge: (saved, current) => ({ ...current, ...sanitizeProgress(saved) }),
      onRehydrateStorage: () => () => {
        // Runs on failure too, so unreadable storage can't leave the app stuck on the splash screen.
        useProgressStore.setState({ hydrated: true });
      },
    },
  ),
);

export function useProgress(): ProgressState {
  return useProgressStore(useShallow(pickProgress));
}
