import { Stack, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonCompleteModal } from '@/components/feedback/LessonCompleteModal';
import { AppText, Column, GameButton, IconBadge, IconButton, InfoChip } from '@/components/ui';
import { VideoLessonPlayer } from '@/components/video/VideoLessonPlayer';
import { findNextPathItem } from '@/domain/course';
import { useCourse } from '@/store/courseStore';
import { getStreak, isWatchedEnough, WATCHED_THRESHOLD } from '@/domain/progress';
import type { PathItem } from '@/domain/types';
import { goBackToPath } from '@/lib/navigation';
import { lockOrientation } from '@/lib/orientation';
import { useProgress, useProgressStore, type Reward } from '@/store/progressStore';
import { cardShadow, colors, radius, spacing } from '@/theme';

type LessonItem = Extract<PathItem, { kind: 'lesson' }>;

export function LessonScreen({ item }: { item: LessonItem }) {
  const insets = useSafeAreaInsets();
  const { lesson, unit, unitNumber, lessonNumber } = item;

  // Store & Progress
  const completeLesson = useProgressStore((state) => state.completeLesson);
  const progress = useProgress();
  const isCompleted = progress.completedLessons.includes(lesson.id);

  // Component States
  const [watched, setWatched] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Computed Values
  const alreadyDone = isCompleted && reward === null;
  const canFinish = alreadyDone || isWatchedEnough(watched, 1);
  const nextItem = findNextPathItem(useCourse().pathItems, lesson.id);

  const handleProgress = useCallback((ratio: number) => {
    setWatched((best) => Math.max(best, ratio));
  }, []);

  // Fullscreen orientation handling
  useEffect(() => {
    if (!fullscreen) return;
    lockOrientation('landscape');
    return () => lockOrientation('portrait');
  }, [fullscreen]);

  // Handle hardware back button in fullscreen
  useFocusEffect(
    useCallback(() => {
      if (!fullscreen) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setFullscreen(false);
        return true;
      });
      return () => subscription.remove();
    }, [fullscreen]),
  );

  const handlePrimary = () => {
    if (alreadyDone) {
      goBackToPath();
      return;
    }
    setReward(completeLesson(lesson.id));
  };

  return (
    <View style={[styles.screen, fullscreen ? styles.fullscreenScreen : { paddingTop: insets.top }]}>
      <Stack.Screen options={{ gestureEnabled: !fullscreen }} />
      <StatusBar hidden={fullscreen} style="dark" />

      <Column fullWidth={fullscreen}>
        {/* Header */}
        {!fullscreen && (
          <View style={styles.header}>
            <IconButton testID="back-button" icon="arrow-back" label="Буцах" onPress={goBackToPath} />
            <AppText testID="lesson-position" variant="label" numberOfLines={1} style={styles.position}>
              БҮЛЭГ {unitNumber} · ХИЧЭЭЛ {lessonNumber} / {unit.lessons.length}
            </AppText>
          </View>
        )}

        {/* Video Player */}
        <View style={fullscreen ? styles.fullscreenPlayer : styles.player}>
          <VideoLessonPlayer
            url={lesson.videoUrl}
            paused={reward !== null}
            fullscreen={fullscreen}
            onFullscreenChange={setFullscreen}
            onProgress={handleProgress}
          />
        </View>

        {/* Lesson Details & Content */}
        {!fullscreen && (
          <ScrollView contentContainerStyle={styles.content}>
            {isCompleted && (
              <View style={styles.chips}>
                <InfoChip
                  icon="checkmark-circle"
                  iconColor={colors.successDark}
                  background={colors.successTint}
                  label="Дууссан"
                />
              </View>
            )}

            <AppText variant="title">{lesson.title}</AppText>
            <AppText color={colors.inkMuted}>{lesson.description}</AppText>

            {nextItem && (
              <View testID="next-step" style={styles.nextCard}>
                <IconBadge
                  icon={nextItem.kind === 'quiz' ? 'star' : 'play'}
                  color={colors.primaryDark}
                  background={colors.primaryTint}
                />
                <View style={styles.nextText}>
                  <AppText variant="label">ДАРААГИЙН АЛХАМ</AppText>
                  <AppText variant="heading" numberOfLines={1}>
                    {nextItem.kind === 'quiz' ? 'Бүлгийн шалгалт' : nextItem.lesson.title}
                  </AppText>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Footer Actions */}
        {!fullscreen && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            {!canFinish && (
              <AppText testID="watch-hint" variant="caption" style={styles.hint}>
                Видеоны {Math.round(WATCHED_THRESHOLD * 100)}%-ийг үзсэний дараа идэвхжинэ
              </AppText>
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
        )}
      </Column>

      {/* Completion Modal */}
      <LessonCompleteModal
        visible={reward !== null}
        xpEarned={reward?.xpEarned ?? 0}
        streak={getStreak(progress.xpByDay, new Date())}
        levelUpTo={reward?.levelUpTo ?? null}
        nextTitle={nextItem ? (nextItem.kind === 'quiz' ? 'Бүлгийн шалгалт' : nextItem.lesson.title) : null}
        onContinue={goBackToPath}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenScreen: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 52,
  },
  position: {
    flex: 1,
  },
  player: {
    paddingHorizontal: spacing.lg,
  },
  fullscreenPlayer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...cardShadow,
  },
  nextText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hint: {
    textAlign: 'center',
  },
});
