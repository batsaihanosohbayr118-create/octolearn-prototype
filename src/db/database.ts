import AsyncStorage from '@react-native-async-storage/async-storage';

import bundledCourse from '@/data/course.json';
import { emptyProgress, sanitizeProgress } from '@/domain/progress';
import type { CourseData, ProgressState } from '@/domain/types';

import { LEGACY_PROGRESS_KEY, type Database } from './types';

/**
 * Web version; phones use database.native.ts. SQLite on the web needs
 * cross-origin isolation headers, which would block the YouTube player, so the
 * web keeps the bundled course and saves progress to browser storage.
 */
let progress: ProgressState = emptyProgress;

function save(next: ProgressState) {
  progress = next;
  // Same format as earlier versions, so progress already in the browser keeps working.
  return AsyncStorage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ state: next, version: 1 })).catch(
    (error: unknown) => console.warn('Could not save progress:', error),
  );
}

function addXp(xpByDay: ProgressState['xpByDay'], day: string, xp: number) {
  return xp > 0 ? { ...xpByDay, [day]: (xpByDay[day] ?? 0) + xp } : xpByDay;
}

export const database: Database = {
  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(LEGACY_PROGRESS_KEY);
      progress = sanitizeProgress(saved ? (JSON.parse(saved) as { state?: unknown } | null)?.state : null);
    } catch {
      progress = emptyProgress;
    }
    return { courseData: bundledCourse as CourseData, progress };
  },

  completeLesson: (lessonId, day, xp) =>
    save(
      progress.completedLessons.includes(lessonId)
        ? progress
        : {
            ...progress,
            completedLessons: [...progress.completedLessons, lessonId],
            xpByDay: addXp(progress.xpByDay, day, xp),
          },
    ),

  saveQuizResult: (quizId, result, day, xp) =>
    save({
      ...progress,
      quizResults: { ...progress.quizResults, [quizId]: result },
      xpByDay: addXp(progress.xpByDay, day, xp),
    }),

  clearProgress: () => save(emptyProgress),
};
