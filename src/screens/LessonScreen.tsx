import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonCompleteModal } from '@/components/overlays';
import { AppText, Column, GameButton, IconButton, ProgressBar } from '@/components/ui';
import { VideoLessonPlayer } from '@/components/VideoLessonPlayer';
import { goBackToPath } from '@/lib/navigation';
import { isWatchedEnough, WATCHED_THRESHOLD } from '@/domain/progress';
import type { PathItem } from '@/domain/types';
import { useProgress, useProgressStore, type Reward } from '@/store/progressStore';
import { colors, spacing } from '@/theme';

type LessonItem = Extract<PathItem, { kind: 'lesson' }>;

export function LessonScreen({ item }: { item: LessonItem }) {
  const insets = useSafeAreaInsets();
  const { lesson, unit, unitNumber, lessonNumber } = item;
  const completeLesson = useProgressStore((state) => state.completeLesson);
  const isCompleted = useProgress().completedLessons.includes(lesson.id);

  // Highest point reached, so rewinding never disables the button again.
  const [watched, setWatched] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const handleProgress = useCallback((ratio: number) => setWatched((best) => Math.max(best, ratio)), []);

  // A rewatch, as opposed to the lesson that was finished just now behind the reward modal.
  const alreadyDone = isCompleted && reward === null;

  const canFinish = alreadyDone || isWatchedEnough(watched, 1);

  const handlePrimary = () => {
    if (alreadyDone) {
      goBackToPath();
      return;
    }
    setReward(completeLesson(lesson.id));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Column>
        <View style={styles.header}>
          <IconButton testID="back-button" icon="arrow-back" label="Буцах" onPress={goBackToPath} />
          <AppText testID="lesson-position" variant="label" numberOfLines={1} style={styles.position}>
            БҮЛЭГ {unitNumber} · ХИЧЭЭЛ {lessonNumber} / {unit.lessons.length}
          </AppText>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <VideoLessonPlayer
            url={lesson.videoUrl}
            paused={reward !== null}
            onProgress={handleProgress}
          />
          <AppText variant="title">{lesson.title}</AppText>
          <AppText color={colors.inkMuted}>{lesson.description}</AppText>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          {canFinish ? null : (
            <View style={styles.watchRow}>
              <ProgressBar testID="watch-progress" value={watched / WATCHED_THRESHOLD} height={8} color={colors.success} />
              <AppText testID="watch-hint" variant="caption">
                {Math.round(WATCHED_THRESHOLD * 100)}% үзсэний дараа идэвхжинэ
              </AppText>
            </View>
          )}
          <GameButton
            testID="finish-button"
            variant={alreadyDone ? 'secondary' : 'success'}
            label={alreadyDone ? 'Зам руу буцах' : 'Дуусгах'}
            icon={alreadyDone ? undefined : 'checkmark'}
            disabled={!canFinish}
            onPress={handlePrimary}
          />
        </View>
      </Column>

      <LessonCompleteModal
        visible={reward !== null}
        xpEarned={reward?.xpEarned ?? 0}
        levelUpTo={reward?.levelUpTo ?? null}
        message="Дараагийн алхам нээгдлээ."
        onContinue={goBackToPath}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, minHeight: 52 },
  position: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
