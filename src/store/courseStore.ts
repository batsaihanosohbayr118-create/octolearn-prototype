import { create } from 'zustand';

import bundledCourse from '@/data/course.json';
import { flattenCourse } from '@/domain/course';
import type { CourseData, PathItem } from '@/domain/types';

type CourseStore = {
  courseData: CourseData;
  pathItems: PathItem[];
  setCourse: (courseData: CourseData) => void;
};

function withPath(courseData: CourseData) {
  return { courseData, pathItems: flattenCourse(courseData) };
}

/** The course read from the database; the bundled copy until that has loaded. */
export const useCourseStore = create<CourseStore>()((set) => ({
  ...withPath(bundledCourse as CourseData),
  setCourse: (courseData) => set(withPath(courseData)),
}));

export function useCourse() {
  return {
    courseData: useCourseStore((state) => state.courseData),
    pathItems: useCourseStore((state) => state.pathItems),
  };
}
