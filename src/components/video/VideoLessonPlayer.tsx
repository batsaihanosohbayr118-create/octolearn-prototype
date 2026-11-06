import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getYouTubeId } from '@/domain/video';
import { useLoadTimeout } from '@/lib/useLoadTimeout';

import { VideoError, videoFrameStyle, VideoLoading } from './VideoStates';
import { YouTubeLessonPlayer } from './YouTubeLessonPlayer';

const TIME_UPDATE_INTERVAL_SEC = 0.5;

type PlayerProps = {
  url: string;
  paused: boolean;
  /** Reports how far playback is, from 0 to 1. Should be a stable function. */
  onProgress: (ratio: number) => void;
};

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
    <View style={videoFrameStyle}>
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

/** Plays a lesson from a YouTube link or a video file, whichever its videoUrl points to. */
export function VideoLessonPlayer({
  url,
  paused,
  fullscreen,
  onFullscreenChange,
  onProgress,
}: PlayerProps & { fullscreen: boolean; onFullscreenChange: (fullscreen: boolean) => void }) {
  // Remounting builds a fresh player, the most reliable way to recover from a failed source.
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((value) => value + 1);
  const youTubeId = getYouTubeId(url);

  return youTubeId ? (
    <YouTubeLessonPlayer
      key={attempt}
      videoId={youTubeId}
      paused={paused}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onProgress={onProgress}
      onRetry={retry}
    />
  ) : (
    <FilePlayer key={attempt} url={url} paused={paused} onProgress={onProgress} onRetry={retry} />
  );
}

const styles = StyleSheet.create({
  // Explicit size: on the web a <video> with only absolute insets keeps its intrinsic size and overflows.
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
