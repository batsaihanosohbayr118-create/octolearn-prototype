import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getYouTubeId } from '@/domain/video';
import { colors, radius, spacing } from '@/theme';

import { AppText, GameButton } from './ui';
import { YouTubeFrame } from './YouTubeFrame';

/** Some network failures never emit an error, so an endless spinner becomes an error state. */
const LOAD_TIMEOUT_MS = 20000;
const TIME_UPDATE_INTERVAL_SEC = 0.5;

type PlayerProps = {
  url: string;
  paused: boolean;
  /** Reports how far playback is, from 0 to 1. Should be a stable function. */
  onProgress: (ratio: number) => void;
};

function VideoError({ onRetry }: { onRetry: () => void }) {
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

function VideoLoading() {
  return (
    <View testID="video-loading" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centered]}>
      <ActivityIndicator size="large" color={colors.onColor} />
      <AppText variant="caption" color={colors.onColor}>
        Видео ачаалж байна...
      </AppText>
    </View>
  );
}

function useLoadTimeout(isLoaded: boolean) {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  return timedOut && !isLoaded;
}

function FilePlayer({ url, paused, onProgress, onRetry }: PlayerProps & { onRetry: () => void }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.timeUpdateEventInterval = TIME_UPDATE_INTERVAL_SEC;
  });
  const [status, setStatus] = useState<VideoPlayerStatus>(player.status);
  const [hasLoaded, setHasLoaded] = useState(player.status === 'readyToPlay');
  const timedOut = useLoadTimeout(hasLoaded);

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
    if (paused) player.pause();
  }, [paused, player]);

  if (status === 'error' || timedOut) return <VideoError onRetry={onRetry} />;

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
      {status === 'readyToPlay' ? null : <VideoLoading />}
    </View>
  );
}

function YouTubeLessonPlayer({
  videoId,
  paused,
  onProgress,
  onRetry,
}: Omit<PlayerProps, 'url'> & { videoId: string; onRetry: () => void }) {
  const [width, setWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const timedOut = useLoadTimeout(isReady || hasFailed);
  const handleReady = useCallback(() => setIsReady(true), []);
  const handleError = useCallback(() => setHasFailed(true), []);

  if (hasFailed || timedOut) return <VideoError onRetry={onRetry} />;

  return (
    <View testID="youtube-frame" style={styles.frame} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <YouTubeFrame
          videoId={videoId}
          width={width}
          height={(width * 9) / 16}
          paused={paused}
          onReady={handleReady}
          onError={handleError}
          onProgress={onProgress}
        />
      ) : null}
      {isReady ? null : <VideoLoading />}
    </View>
  );
}

/** Plays a lesson from a YouTube link or a video file, whichever its videoUrl points to. */
export function VideoLessonPlayer({ url, paused, onProgress }: PlayerProps) {
  // Remounting builds a fresh player, the most reliable way to recover from a failed source.
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((value) => value + 1);
  const youTubeId = getYouTubeId(url);

  return youTubeId ? (
    <YouTubeLessonPlayer key={attempt} videoId={youTubeId} paused={paused} onProgress={onProgress} onRetry={retry} />
  ) : (
    <FilePlayer key={attempt} url={url} paused={paused} onProgress={onProgress} onRetry={retry} />
  );
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
