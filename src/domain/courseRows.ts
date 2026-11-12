import type { CourseData, Unit } from './types';

/** Table rows as stored in the database, one array per table. */
export type CourseRows = {
  course: { id: string; title: string };
  user: CourseData['user'];
  units: { id: string; position: number; title: string; coming_soon: number }[];
  lessons: {
    id: string;
    unit_id: string;
    position: number;
    title: string;
    description: string;
    video_url: string;
    duration_sec: number;
  }[];
  quizzes: { id: string; unit_id: string; pass_percent: number }[];
  questions: {
    id: string;
    quiz_id: string;
    position: number;
    text: string;
    /** JSON array of strings. */
    options: string;
    answer_index: number;
  }[];
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/**
 * Builds the nested course from flat table rows. Returns null when the rows
 * can't make a usable course (no units, or a unit without its quiz).
 */
export function courseFromRows(rows: CourseRows): CourseData | null {
  if (rows.units.length === 0) return null;

  const units: Unit[] = [];
  for (const unit of [...rows.units].sort(byPosition)) {
    const quiz = rows.quizzes.find((row) => row.unit_id === unit.id);
    if (!quiz) return null;

    units.push({
      id: unit.id,
      title: unit.title,
      ...(unit.coming_soon ? { comingSoon: true } : {}),
      lessons: rows.lessons
        .filter((lesson) => lesson.unit_id === unit.id)
        .sort(byPosition)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoUrl: lesson.video_url,
          durationSec: lesson.duration_sec,
        })),
      quiz: {
        id: quiz.id,
        passPercent: quiz.pass_percent,
        questions: rows.questions
          .filter((question) => question.quiz_id === quiz.id)
          .sort(byPosition)
          .map((question) => ({
            id: question.id,
            text: question.text,
            options: JSON.parse(question.options) as string[],
            answerIndex: question.answer_index,
          })),
      },
    });
  }

  return { course: rows.course, units, user: rows.user };
}

/** The reverse of courseFromRows, used to seed the database from the bundled course. */
export function rowsFromCourse(data: CourseData): CourseRows {
  return {
    course: data.course,
    user: data.user,
    units: data.units.map((unit, index) => ({
      id: unit.id,
      position: index,
      title: unit.title,
      coming_soon: unit.comingSoon ? 1 : 0,
    })),
    lessons: data.units.flatMap((unit) =>
      unit.lessons.map((lesson, index) => ({
        id: lesson.id,
        unit_id: unit.id,
        position: index,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.videoUrl,
        duration_sec: lesson.durationSec,
      })),
    ),
    quizzes: data.units.map((unit) => ({
      id: unit.quiz.id,
      unit_id: unit.id,
      pass_percent: unit.quiz.passPercent,
    })),
    questions: data.units.flatMap((unit) =>
      unit.quiz.questions.map((question, index) => ({
        id: question.id,
        quiz_id: unit.quiz.id,
        position: index,
        text: question.text,
        options: JSON.stringify(question.options),
        answer_index: question.answerIndex,
      })),
    ),
  };
}

/** Short FNV-1a hash, enough to notice that the bundled course changed. */
export function contentHash(data: CourseData): string {
  const text = JSON.stringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
