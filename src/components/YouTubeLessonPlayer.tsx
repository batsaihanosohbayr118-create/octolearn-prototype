import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';

import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { useLoadTimeout } from '@/lib/useLoadTimeout';
import { colors, useNativeDriver } from '@/theme';

import { VideoControls } from './VideoControls';
import { VideoError, videoFrameStyle, VideoLoading } from './VideoStates';
import { YouTubeFrame } from './YouTubeFrame';
import type { YouTubeFrameHandle, YouTubeState } from './YouTubeFrame.types';

const CONTROLS_HIDE_MS = 3000;
/** Some WebViews refuse to start a video from code, without a tap on the video itself. */
const START_TIMEOUT_MS = 8000;
const MIN_ADVANCE_SEC = 0.1;

type YouTubeLessonPlayerProps = {
  videoId: string;
  paused: boolean;
  fullscreen: boolean;
  onFullscreenChange: (fullscreen: boolean) => void;
  /** Should be a stable function. */
  onProgress: (ratio: number) => void;
  onRetry: () => void;
};

function FadeIn({ children }: { children: ReactNode }) {
  const opacity = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver }).start();
  }, [opacity]);
  return (
    <Animated.View testID="video-controls" pointerEvents="box-none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function YouTubeLessonPlayer({
  videoId,
  paused,
  fullscreen,
  onFullscreenChange,
  onProgress,
  onRetry,
}: YouTubeLessonPlayerProps) {
  const frameRef = useRef<YouTubeFrameHandle>(null);
  const startedFrom = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [failure, setFailure] = useState<{ code?: string | number } | null>(null);
  const hasFailed = failure !== null;
  const [state, setState] = useState<YouTubeState>('idle');
  const [isStarting, setIsStarting] = useState(false);
  const [startWasRefused, setStartWasRefused] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const timedOut = useLoadTimeout(isReady || hasFailed);

  const isPlaying = state === 'playing';
  // The poster covers YouTube's own start and end screens, never the playing video.
  const showPoster = state === 'idle' || state === 'ended' || (isStarting && time.current === 0);

  const handleReady = useCallback(() => setIsReady(true), []);
  const handleError = useCallback((code?: string | number) => setFailure({ code }), []);
  const handleTime = useCallback(
    (current: number, duration: number) => {
      setTime({ current, duration });
      onProgress(current / duration);
      // Only a moving clock proves a start worked: a refused start can still report 'playing'.
      if (current > startedFrom.current + MIN_ADVANCE_SEC) {
        setIsStarting(false);
        setStartWasRefused(false);
      }
    },
    [onProgress],
  );
  const handleState = useCallback(
    (next: YouTubeState) => {
      setState(next);
      if (next === 'ended') setIsStarting(false);
      if (next === 'paused') setControlsVisible(true);
      if (next === 'ended') {
        onProgress(1);
        // The finish button lives outside fullscreen.
        onFullscreenChange(false);
      }
    },
    [onFullscreenChange, onProgress],
  );
  const handleSeek = useCallback((seconds: number) => {
    frameRef.current?.seekTo(seconds);
    setTime((previous) => ({ ...previous, current: seconds }));
  }, []);

  useEffect(() => {
    if (paused) frameRef.current?.pause();
  }, [paused]);

  // If the video won't start from our button, get out of the way so YouTube's own button can be tapped.
  useEffect(() => {
    if (!isStarting) return;
    const timer = setTimeout(() => {
      setIsStarting(false);
      setStartWasRefused(true);
      frameRef.current?.pause();
    }, START_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isStarting]);

  // Paused or being dragged, the controls stay; while playing they get out of the way.
  useEffect(() => {
    if (!controlsVisible || !isPlaying || isDragging) return;
    const timer = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    return () => clearTimeout(timer);
  }, [controlsVisible, isPlaying, isDragging]);

  const start = () => {
    startedFrom.current = state === 'ended' ? 0 : time.current;
    setIsStarting(true);
    setControlsVisible(false);
    if (state === 'ended') frameRef.current?.seekTo(0);
    frameRef.current?.play();
  };

  if (hasFailed || timedOut) return <VideoError code={failure?.code} onRetry={onRetry} />;

  return (
    <View
      testID="youtube-frame"
      style={fullscreen ? styles.fullscreenFrame : videoFrameStyle}
      onLayout={({ nativeEvent }) => setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })}
    >
      {size.width > 0 ? (
        <YouTubeFrame
          ref={frameRef}
          videoId={videoId}
          width={size.width}
          height={size.height}
          onReady={handleReady}
          onError={handleError}
          onStateChange={handleState}
          onTime={handleTime}
        />
      ) : null}

      {startWasRefused ? null : showPoster ? (
        <Pressable
          testID="video-start"
          accessibilityRole="button"
          accessibilityLabel={state === 'ended' ? 'Дахин үзэх' : 'Видео тоглуулах'}
          disabled={!isReady || isStarting}
          onPress={start}
          style={[StyleSheet.absoluteFill, styles.poster]}
        >
          <Image
            source={{ uri: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          {isReady ? (
            <View style={styles.startButton}>
              <Ionicons name={state === 'ended' ? 'refresh' : 'play'} size={36} color={colors.onColor} />
            </View>
          ) : null}
          {!isReady || isStarting ? <VideoLoading /> : null}
        </Pressable>
      ) : (
        <>
          {/* Keeps taps on our controls, away from YouTube's title and links underneath. */}
          <Pressable
            testID="video-surface"
            accessibilityLabel="Удирдлага харуулах"
            onPress={() => setControlsVisible((visible) => !visible)}
            style={StyleSheet.absoluteFill}
          />
          {/* Unmounted when hidden, so invisible buttons can't catch taps. */}
          {controlsVisible ? (
            <FadeIn>
              <VideoControls
                isPlaying={isPlaying}
                isBuffering={state === 'buffering'}
                currentTime={time.current}
                duration={time.duration}
                fullscreen={fullscreen}
                onTogglePlay={() => (isPlaying ? frameRef.current?.pause() : start())}
                onSeek={handleSeek}
                onDraggingChange={setIsDragging}
                onToggleFullscreen={() => onFullscreenChange(!fullscreen)}
              />
            </FadeIn>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenFrame: { flex: 1, width: '100%', backgroundColor: '#000000', overflow: 'hidden' },
  poster: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  startButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
