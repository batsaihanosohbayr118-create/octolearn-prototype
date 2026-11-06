import rawCourse from '@/data/course.json';

import type { CourseData, PathItem } from './types';

export const courseData = rawCourse as CourseData;

export function flattenCourse(data: CourseData): PathItem[] {
  return data.units.flatMap((unit, unitIndex): PathItem[] => [
    ...unit.lessons.map(
      (lesson, lessonIndex): PathItem => ({
        kind: 'lesson',
        id: lesson.id,
        unit,
        unitNumber: unitIndex + 1,
        lesson,
        lessonNumber: lessonIndex + 1,
      }),
    ),
    { kind: 'quiz', id: unit.quiz.id, unit, unitNumber: unitIndex + 1, quiz: unit.quiz },
  ]);
}

export const pathItems = flattenCourse(courseData);

/** The stop after this one on the pathway. */
export function findNextPathItem(id: string): PathItem | undefined {
  return pathItems[pathItems.findIndex((item) => item.id === id) + 1];
}

export function findPathItem(id: string | undefined): PathItem | undefined {
  return pathItems.find((item) => item.id === id);
}
