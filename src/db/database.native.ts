import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import bundledCourse from '@/data/course.json';
import { contentHash, courseFromRows, rowsFromCourse, type CourseRows } from '@/domain/courseRows';
import { sanitizeProgress } from '@/domain/progress';
import type { CourseData, ProgressState, QuizResult } from '@/domain/types';

import { LEGACY_PROGRESS_KEY, type Database } from './types';

const fallbackCourse = bundledCourse as CourseData;
const SCHEMA_VERSION = 1;

const SCHEMA_V1 = `
PRAGMA journal_mode = WAL;

CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

CREATE TABLE units (
  id TEXT PRIMARY KEY NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  coming_soon INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE lessons (
  id TEXT PRIMARY KEY NOT NULL,
  unit_id TEXT NOT NULL REFERENCES units (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL
);
CREATE TABLE quizzes (
  id TEXT PRIMARY KEY NOT NULL,
  unit_id TEXT NOT NULL UNIQUE REFERENCES units (id) ON DELETE CASCADE,
  pass_percent INTEGER NOT NULL
);
CREATE TABLE questions (
  id TEXT PRIMARY KEY NOT NULL,
  quiz_id TEXT NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  answer_index INTEGER NOT NULL
);

-- Progress refers to content by id only, so a content update never deletes it.
CREATE TABLE completed_lessons (
  lesson_id TEXT PRIMARY KEY NOT NULL,
  completed_at TEXT
);
CREATE TABLE quiz_results (
  quiz_id TEXT PRIMARY KEY NOT NULL,
  best_correct INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE TABLE xp_by_day (
  day TEXT PRIMARY KEY NOT NULL,
  xp INTEGER NOT NULL
);
`;

async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;
  if (version === 0) {
    await db.execAsync(SCHEMA_V1);
    version = 1;
  }
  // Later schema changes go here as `if (version === 1) { ... }`.
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

async function getMeta(db: SQLiteDatabase, key: string) {
  return (await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key))?.value;
}

async function setMeta(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
}

/** Copies the bundled course into the tables on first run and whenever an app update changes course.json. */
async function seedContent(db: SQLiteDatabase) {
  const hash = contentHash(fallbackCourse);
  if ((await getMeta(db, 'content_hash')) === hash) return;

  const rows = rowsFromCourse(fallbackCourse);
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM questions; DELETE FROM quizzes; DELETE FROM lessons; DELETE FROM units;');
    for (const unit of rows.units) {
      await db.runAsync(
        'INSERT INTO units (id, position, title, coming_soon) VALUES (?, ?, ?, ?)',
        unit.id,
        unit.position,
        unit.title,
        unit.coming_soon,
      );
    }
    for (const lesson of rows.lessons) {
      await db.runAsync(
        `INSERT INTO lessons (id, unit_id, position, title, description, video_url, duration_sec)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        lesson.id,
        lesson.unit_id,
        lesson.position,
        lesson.title,
        lesson.description,
        lesson.video_url,
        lesson.duration_sec,
      );
    }
    for (const quiz of rows.quizzes) {
      await db.runAsync(
        'INSERT INTO quizzes (id, unit_id, pass_percent) VALUES (?, ?, ?)',
        quiz.id,
        quiz.unit_id,
        quiz.pass_percent,
      );
    }
    for (const question of rows.questions) {
      await db.runAsync(
        'INSERT INTO questions (id, quiz_id, position, text, options, answer_index) VALUES (?, ?, ?, ?, ?, ?)',
        question.id,
        question.quiz_id,
        question.position,
        question.text,
        question.options,
        question.answer_index,
      );
    }
    await setMeta(db, 'course_id', rows.course.id);
    await setMeta(db, 'course_title', rows.course.title);
    // The profile belongs to the learner, so a content update doesn't overwrite it.
    if ((await getMeta(db, 'user_name')) === undefined) {
      await setMeta(db, 'user_name', rows.user.name);
      if (rows.user.avatarUrl) await setMeta(db, 'user_avatar_url', rows.user.avatarUrl);
    }
    await setMeta(db, 'content_hash', hash);
  });
}

async function upsertQuizResult(db: SQLiteDatabase, quizId: string, result: QuizResult) {
  await db.runAsync(
    `INSERT OR REPLACE INTO quiz_results (quiz_id, best_correct, total, passed, xp_awarded, attempts)
     VALUES (?, ?, ?, ?, ?, ?)`,
    quizId,
    result.bestCorrect,
    result.total,
    result.passed ? 1 : 0,
    result.xpAwarded,
    result.attempts,
  );
}

async function addXp(db: SQLiteDatabase, day: string, xp: number) {
  if (xp <= 0) return;
  await db.runAsync(
    'INSERT INTO xp_by_day (day, xp) VALUES (?, ?) ON CONFLICT (day) DO UPDATE SET xp = xp + excluded.xp',
    day,
    xp,
  );
}

/** Moves progress saved by earlier versions of the app (AsyncStorage) into the database, once. */
async function importLegacyProgress(db: SQLiteDatabase) {
  const saved = await AsyncStorage.getItem(LEGACY_PROGRESS_KEY);
  if (saved === null) return;

  let parsed: unknown = null;
  try {
    parsed = (JSON.parse(saved) as { state?: unknown } | null)?.state;
  } catch {
    // Unreadable data is dropped, as it was before.
  }
  const progress = sanitizeProgress(parsed);
  await db.withTransactionAsync(async () => {
    for (const id of progress.completedLessons) {
      await db.runAsync('INSERT OR IGNORE INTO completed_lessons (lesson_id) VALUES (?)', id);
    }
    for (const [id, result] of Object.entries(progress.quizResults)) {
      await upsertQuizResult(db, id, result);
    }
    for (const [day, xp] of Object.entries(progress.xpByDay)) {
      await db.runAsync('INSERT OR REPLACE INTO xp_by_day (day, xp) VALUES (?, ?)', day, xp);
    }
  });
  await AsyncStorage.removeItem(LEGACY_PROGRESS_KEY);
}

async function readCourse(db: SQLiteDatabase): Promise<CourseData> {
  const rows: CourseRows = {
    course: {
      id: (await getMeta(db, 'course_id')) ?? fallbackCourse.course.id,
      title: (await getMeta(db, 'course_title')) ?? fallbackCourse.course.title,
    },
    user: {
      name: (await getMeta(db, 'user_name')) ?? fallbackCourse.user.name,
      avatarUrl: (await getMeta(db, 'user_avatar_url')) ?? null,
    },
    units: await db.getAllAsync('SELECT * FROM units'),
    lessons: await db.getAllAsync('SELECT * FROM lessons'),
    quizzes: await db.getAllAsync('SELECT * FROM quizzes'),
    questions: await db.getAllAsync('SELECT * FROM questions'),
  };
  return courseFromRows(rows) ?? fallbackCourse;
}

type QuizResultRow = {
  quiz_id: string;
  best_correct: number;
  total: number;
  passed: number;
  xp_awarded: number;
  attempts: number;
};

async function readProgress(db: SQLiteDatabase): Promise<ProgressState> {
  const lessons = await db.getAllAsync<{ lesson_id: string }>(
    'SELECT lesson_id FROM completed_lessons ORDER BY rowid',
  );
  const quizzes = await db.getAllAsync<QuizResultRow>('SELECT * FROM quiz_results');
  const days = await db.getAllAsync<{ day: string; xp: number }>('SELECT day, xp FROM xp_by_day');

  // Same validation as any other saved data.
  return sanitizeProgress({
    completedLessons: lessons.map((row) => row.lesson_id),
    quizResults: Object.fromEntries(
      quizzes.map((row) => [
        row.quiz_id,
        {
          bestCorrect: row.best_correct,
          total: row.total,
          passed: row.passed === 1,
          xpAwarded: row.xp_awarded,
          attempts: row.attempts,
        },
      ]),
    ),
    xpByDay: Object.fromEntries(days.map((row) => [row.day, row.xp])),
  });
}

let opened: Promise<SQLiteDatabase> | null = null;

function open() {
  opened ??= (async () => {
    const db = await openDatabaseAsync('octolearn.db');
    await db.execAsync('PRAGMA foreign_keys = ON');
    await migrate(db);
    await seedContent(db);
    await importLegacyProgress(db);
    return db;
  })();
  return opened;
}

/** Writes run one after another, in the order the learner made them. */
let queue: Promise<void> = Promise.resolve();

function enqueue(task: (db: SQLiteDatabase) => Promise<void>): Promise<void> {
  queue = queue
    .then(async () => {
      const db = await open();
      await db.withTransactionAsync(() => task(db));
    })
    .catch((error: unknown) => console.warn('Could not save progress:', error));
  return queue;
}

export const database: Database = {
  load: async () => {
    const db = await open();
    return { courseData: await readCourse(db), progress: await readProgress(db) };
  },

  completeLesson: (lessonId, day, xp) =>
    enqueue(async (db) => {
      await db.runAsync(
        'INSERT OR IGNORE INTO completed_lessons (lesson_id, completed_at) VALUES (?, ?)',
        lessonId,
        new Date().toISOString(),
      );
      await addXp(db, day, xp);
    }),

  saveQuizResult: (quizId, result, day, xp) =>
    enqueue(async (db) => {
      await upsertQuizResult(db, quizId, result);
      await addXp(db, day, xp);
    }),

  clearProgress: () =>
    enqueue((db) =>
      db.execAsync('DELETE FROM completed_lessons; DELETE FROM quiz_results; DELETE FROM xp_by_day;'),
    ),
};
