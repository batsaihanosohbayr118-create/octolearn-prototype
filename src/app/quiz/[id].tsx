import { Redirect, useLocalSearchParams } from 'expo-router';

import { findPathItem } from '@/domain/course';
import { getItemStatuses } from '@/domain/progress';
import { QuizScreen } from '@/screens/QuizScreen';
import { useCourse } from '@/store/courseStore';
import { useProgress } from '@/store/progressStore';

export default function QuizRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const progress = useProgress();
  const { pathItems } = useCourse();
  const item = findPathItem(pathItems, id);

  // Deep links and web URLs must obey the same lock rules as the pathway.
  if (
    item?.kind !== 'quiz' ||
    item.quiz.questions.length === 0 ||
    getItemStatuses(pathItems, progress)[item.id] === 'locked'
  ) {
    return <Redirect href="/" />;
  }
  return <QuizScreen item={item} />;
}
