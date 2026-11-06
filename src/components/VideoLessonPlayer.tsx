import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText, GameButton } from './ui';

/** Some network failures never emit an error, so an endless spinner becomes an error state. */
const LOAD_TIMEOUT_MS = 20000;
const TIME_UPDATE_INTERVAL_SEC = 0.5;

type PlayerProps = {
  url: string;
  paused: boolean;
  /** Reports how far playback is, from 0 to 1. */
  onProgress: (ratio: number) => void;
};

function Player({ url, paused, onProgress, onRetry }: PlayerProps & { onRetry: () => void }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.timeUpdateEventInterval = TIME_UPDATE_INTERVAL_SEC;
  });
  const [status, setStatus] = useState<VideoPlayerStatus>(player.status);
  const [hasLoaded, setHasLoaded] = useState(player.status === 'readyToPlay');
  const [timedOut, setTimedOut] = useState(false);

  useEventListener(player, 'statusChange', ({ status: next }) => {
    setStatus(next);
    if (next === 'readyToPlay') setHasLoaded(true);
  });

  const report = useCallback(
    (currentTime: number) => {
      if (player.duration > 0) onProgress(currentTime / player.duration);
    },
    [onProgress, player],
  );

  useEventListener(player, 'timeUpdate', ({ currentTime }) => report(currentTime));
  useEventListener(player, 'playToEnd', () => onProgress(1));

  useEffect(() => {
    if (hasLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hasLoaded]);

  useEffect(() => {
    if (paused) player.pause();
  }, [paused, player]);

  if (status === 'error' || (timedOut && !hasLoaded)) {
    return (
      <View testID="video-error" style={[styles.frame, styles.centered]}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.onColor} />
        <AppText variant="caption" color={colors.onColor} style={styles.errorText}>
          Видео ачаалагдсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.
        </AppText>
        <View style={styles.retry}>
          <GameButton testID="video-retry" label="Дахин оролдох" icon="refresh" onPress={onRetry} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <VideoView
        testID="video-view"
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        // Android pauses JS during fullscreen, so time updates are missed until it exits.
        onFullscreenExit={() => report(player.currentTime)}
        style={styles.video}
      />
      {status === 'readyToPlay' ? null : (
        <View testID="video-loading" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centered]}>
          <ActivityIndicator size="large" color={colors.onColor} />
          <AppText variant="caption" color={colors.onColor}>
            Видео ачаалж байна...
          </AppText>
        </View>
      )}
    </View>
  );
}

export function VideoLessonPlayer(props: PlayerProps) {
  // Remounting builds a fresh player, the most reliable way to recover from a failed source.
  const [attempt, setAttempt] = useState(0);
  return <Player key={attempt} {...props} onRetry={() => setAttempt((value) => value + 1)} />;
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  // Explicit size: on the web a <video> with only absolute insets keeps its intrinsic size and overflows.
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md },
  errorText: { textAlign: 'center' },
  retry: { minWidth: 190 },
});
