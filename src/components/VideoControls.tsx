import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { formatTime } from '@/domain/video';
import { colors, MIN_TOUCH_TARGET, spacing } from '@/theme';

import { AppText, type IconName } from './ui';

const KEYBOARD_SEEK_SEC = 10;
const THUMB_SIZE = 14;

function ControlButton({ icon, label, onPress, testID }: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.controlButton}
    >
      <Ionicons name={icon} size={24} color={colors.onColor} />
    </Pressable>
  );
}

function SeekBar({ currentTime, duration, onSeek, onDraggingChange }: {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const [width, setWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const panResponder = useMemo(() => {
    const ratioAt = (event: GestureResponderEvent) =>
      width > 0 ? Math.min(Math.max(event.nativeEvent.locationX / width, 0), 1) : 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        setDragRatio(ratioAt(event));
        onDraggingChange(true);
      },
      onPanResponderMove: (event) => setDragRatio(ratioAt(event)),
      onPanResponderRelease: (event) => {
        onSeek(ratioAt(event) * duration);
        setDragRatio(null);
        onDraggingChange(false);
      },
      onPanResponderTerminate: () => {
        setDragRatio(null);
        onDraggingChange(false);
      },
    });
  }, [width, duration, onSeek, onDraggingChange]);

  const ratio = dragRatio ?? (duration > 0 ? currentTime / duration : 0);
  const percent = `${Math.min(ratio, 1) * 100}%` as const;

  return (
    <View
      testID="seek-bar"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Видео гүйлгэх"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        const step = nativeEvent.actionName === 'increment' ? KEYBOARD_SEEK_SEC : -KEYBOARD_SEEK_SEC;
        onSeek(Math.min(Math.max(currentTime + step, 0), duration));
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.seekHit}
      {...panResponder.panHandlers}
    >
      <View pointerEvents="none" style={styles.seekTrack}>
        <View style={[styles.seekFill, { width: percent }]} />
      </View>
      <View pointerEvents="none" style={[styles.seekThumb, { left: percent }]} />
    </View>
  );
}

type VideoControlsProps = {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  fullscreen: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onDraggingChange: (dragging: boolean) => void;
  onToggleFullscreen: () => void;
};

/** Play, seek, time and fullscreen, shown over the video. Taps on the empty area fall through to the layer below. */
export function VideoControls({
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  fullscreen,
  onTogglePlay,
  onSeek,
  onDraggingChange,
  onToggleFullscreen,
}: VideoControlsProps) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />

      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>
        {isBuffering ? (
          <ActivityIndicator testID="video-buffering" size="large" color={colors.onColor} />
        ) : (
          <Pressable
            testID="video-toggle"
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Зогсоох' : 'Тоглуулах'}
            onPress={onTogglePlay}
            style={styles.playButton}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={colors.onColor} />
          </Pressable>
        )}
      </View>

      <View pointerEvents="box-none" style={styles.bottomRow}>
        <AppText testID="video-time" variant="caption" color={colors.onColor} style={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </AppText>
        <SeekBar currentTime={currentTime} duration={duration} onSeek={onSeek} onDraggingChange={onDraggingChange} />
        <ControlButton
          testID="video-fullscreen"
          icon={fullscreen ? 'contract' : 'expand'}
          label={fullscreen ? 'Бүтэн дэлгэцээс гарах' : 'Бүтэн дэлгэц'}
          onPress={onToggleFullscreen}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  center: { alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.xs,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: { minWidth: 76 },
  controlButton: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  seekHit: { flex: 1, height: MIN_TOUCH_TARGET, justifyContent: 'center' },
  seekTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.35)', overflow: 'hidden' },
  seekFill: { height: 4, backgroundColor: colors.onColor },
  seekThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    marginLeft: -THUMB_SIZE / 2,
    backgroundColor: colors.onColor,
  },
});
