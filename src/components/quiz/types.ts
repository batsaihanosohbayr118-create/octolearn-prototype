import type { PathItem } from '@/domain/types';
import type { Reward } from '@/store/progressStore';

export type QuizItem = Extract<PathItem, { kind: 'quiz' }>;

export type QuizAttempt = Reward & { passed: boolean; correct: number };
