import rawCourse from '@/data/course.json';

import { findNextPathItem, flattenCourse } from '../course';
import { contentHash, courseFromRows, rowsFromCourse } from '../courseRows';
import type { CourseData } from '../types';

const course = rawCourse as CourseData;

describe('course rows', () => {
  it('round-trips the bundled course through database rows', () => {
    expect(courseFromRows(rowsFromCourse(course))).toEqual(course);
  });

  it('orders by position, not by the order rows come back in', () => {
    const rows = rowsFromCourse(course);
    rows.units.reverse();
    rows.lessons.reverse();
    rows.questions.reverse();
    expect(courseFromRows(rows)).toEqual(course);
  });

  it('rejects rows without units or with a unit missing its quiz', () => {
    expect(courseFromRows({ ...rowsFromCourse(course), units: [] })).toBeNull();
    const rows = rowsFromCourse(course);
    rows.quizzes = rows.quizzes.slice(1);
    expect(courseFromRows(rows)).toBeNull();
  });

  it('changes the content hash when the course changes', () => {
    const edited = { ...course, course: { ...course.course, title: 'Шинэ нэр' } };
    expect(contentHash(course)).toBe(contentHash(structuredClone(course)));
    expect(contentHash(edited)).not.toBe(contentHash(course));
  });
});

describe('findNextPathItem', () => {
  it('returns nothing for an unknown id instead of the first item', () => {
    expect(findNextPathItem(flattenCourse(course), 'missing')).toBeUndefined();
  });
});
