export type Lesson = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  durationSec: number;
};

export type Question = {
  id: string;
  text: string;
  options: string[];
  answerIndex: number;
};

export type Quiz = {
  id: string;
  passPercent: number;
  questions: Question[];
};

export type Unit = {
  id: string;
  title: string;
  /** Visible on the pathway but not playable yet. */
  comingSoon?: boolean;
  lessons: Lesson[];
  quiz: Quiz;
};

export type CourseData = {
  course: { id: string; title: string };
  units: Unit[];
  user: { name: string; avatarUrl: string | null };
};

/** One stop on the pathway: a lesson or a unit's quiz, in play order. */
export type PathItem =
  | { kind: 'lesson'; id: string; unit: Unit; unitNumber: number; lesson: Lesson; lessonNumber: number }
  | { kind: 'quiz'; id: string; unit: Unit; unitNumber: number; quiz: Quiz };

export type ItemStatus = 'completed' | 'active' | 'locked';

export type QuizResult = {
  bestCorrect: number;
  total: number;
  passed: boolean;
  /** XP already paid for this quiz, so retakes only pay the improvement. */
  xpAwarded: number;
  attempts: number;
};

/** Everything that is persisted. Total XP and streak are derived from xpByDay. */
export type ProgressState = {
  completedLessons: string[];
  quizResults: Record<string, QuizResult>;
  /** Local-date key (YYYY-MM-DD) to XP earned that day. */
  xpByDay: Record<string, number>;
};
