import { Redirect, useLocalSearchParams } from 'expo-router';

import { findPathItem } from '@/domain/course';
import { getItemStatuses } from '@/domain/progress';
import { LessonScreen } from '@/screens/LessonScreen';
import { useCourse } from '@/store/courseStore';
import { useProgress } from '@/store/progressStore';

export default function LessonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const progress = useProgress();
  const { pathItems } = useCourse();
  const item = findPathItem(pathItems, id);

  // Deep links and web URLs must obey the same lock rules as the pathway.
  if (item?.kind !== 'lesson' || getItemStatuses(pathItems, progress)[item.id] === 'locked') {
    return <Redirect href="/" />;
  }
  return <LessonScreen item={item} />;
}
