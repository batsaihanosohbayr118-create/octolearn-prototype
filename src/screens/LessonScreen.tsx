import { Stack, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonCompleteModal } from '@/components/overlays';
import { AppText, Column, GameButton, IconButton } from '@/components/ui';
import { VideoLessonPlayer } from '@/components/VideoLessonPlayer';
import { isWatchedEnough, WATCHED_THRESHOLD } from '@/domain/progress';
import type { PathItem } from '@/domain/types';
import { goBackToPath } from '@/lib/navigation';
import { lockOrientation } from '@/lib/orientation';
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
  const [fullscreen, setFullscreen] = useState(false);
  const handleProgress = useCallback((ratio: number) => setWatched((best) => Math.max(best, ratio)), []);

  // A rewatch, as opposed to the lesson that was finished just now behind the reward modal.
  const alreadyDone = isCompleted && reward === null;

  const canFinish = alreadyDone || isWatchedEnough(watched, 1);

  useEffect(() => {
    if (!fullscreen) return;
    lockOrientation('landscape');
    return () => lockOrientation('portrait');
  }, [fullscreen]);

  // In fullscreen, the hardware back button only leaves fullscreen.
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

  // The player keeps its place in this tree across fullscreen, so the video doesn't restart.
  return (
    <View style={[styles.screen, fullscreen ? styles.fullscreenScreen : { paddingTop: insets.top }]}>
      <Stack.Screen options={{ gestureEnabled: !fullscreen }} />
      <StatusBar hidden={fullscreen} style="dark" />
      <Column fullWidth={fullscreen}>
        {fullscreen ? null : (
          <View style={styles.header}>
            <IconButton testID="back-button" icon="arrow-back" label="Буцах" onPress={goBackToPath} />
            <AppText testID="lesson-position" variant="label" numberOfLines={1} style={styles.position}>
              БҮЛЭГ {unitNumber} · ХИЧЭЭЛ {lessonNumber} / {unit.lessons.length}
            </AppText>
          </View>
        )}

        <View style={fullscreen ? styles.fullscreenPlayer : styles.player}>
          <VideoLessonPlayer
            url={lesson.videoUrl}
            paused={reward !== null}
            fullscreen={fullscreen}
            onFullscreenChange={setFullscreen}
            onProgress={handleProgress}
          />
        </View>

        {fullscreen ? null : (
          <ScrollView contentContainerStyle={styles.content}>
            <AppText variant="title">{lesson.title}</AppText>
            <AppText color={colors.inkMuted}>{lesson.description}</AppText>
          </ScrollView>
        )}

        {fullscreen ? null : (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            {canFinish ? null : (
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
  fullscreenScreen: { backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, minHeight: 52 },
  position: { flex: 1 },
  player: { paddingHorizontal: spacing.lg },
  fullscreenPlayer: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  hint: { textAlign: 'center' },
});
