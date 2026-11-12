import type { CourseData, ProgressState, QuizResult } from '@/domain/types';

/** Storage for course content and learner progress. */
export type Database = {
  /** Opens the database (creating and seeding it on first run) and reads everything. */
  load: () => Promise<{ courseData: CourseData; progress: ProgressState }>;
  completeLesson: (lessonId: string, day: string, xp: number) => Promise<void>;
  saveQuizResult: (quizId: string, result: QuizResult, day: string, xp: number) => Promise<void>;
  clearProgress: () => Promise<void>;
};

/** Progress saved before the database existed, under this AsyncStorage key. */
export const LEGACY_PROGRESS_KEY = 'octolearn-progress';
