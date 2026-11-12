import type { CourseData, PathItem } from './types';

export function flattenCourse(data: CourseData): PathItem[] {
  return data.units.flatMap((unit, unitIndex): PathItem[] => [
    ...unit.lessons.map((lesson, lessonIndex): PathItem => ({
      kind: 'lesson',
      id: lesson.id,
      unit,
      unitNumber: unitIndex + 1,
      lesson,
      lessonNumber: lessonIndex + 1,
    })),
    { kind: 'quiz', id: unit.quiz.id, unit, unitNumber: unitIndex + 1, quiz: unit.quiz },
  ]);
}

/** The stop after this one on the pathway. */
export function findNextPathItem(items: PathItem[], id: string): PathItem | undefined {
  const index = items.findIndex((item) => item.id === id);
  return index === -1 ? undefined : items[index + 1];
}

export function findPathItem(items: PathItem[], id: string | undefined): PathItem | undefined {
  return items.find((item) => item.id === id);
}
