import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { colors, radius, spacing, useNativeDriver } from '@/theme';

import { AppText, GameButton, type IconName } from './ui';

const CONFETTI_COLORS = [colors.primary, colors.gold, colors.success, colors.danger, colors.primarySoft];
const CONFETTI_COUNT = 28;

function createConfettiPieces(width: number) {
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
    left: Math.random() * width,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    progress: new Animated.Value(0),
    duration: 1400 + Math.random() * 1000,
    delay: Math.random() * 300,
    spin: Math.random() > 0.5 ? '540deg' : '-540deg',
  }));
}

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const [pieces] = useState(() => createConfettiPieces(width));

  useEffect(() => {
    const animation = Animated.parallel(
      pieces.map(({ progress, duration, delay }) =>
        Animated.timing(progress, { toValue: 1, duration, delay, useNativeDriver }),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map(({ left, color, progress, spin }, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              left,
              backgroundColor: color,
              opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-20, height] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', spin] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function PopIn({ children }: { children: React.ReactNode }) {
  const scale = useAnimatedValue(0.6);
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver }).start();
  }, [scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

export function LessonCompleteModal({
  visible,
  xpEarned,
  levelUpTo,
  message,
  onContinue,
}: {
  visible: boolean;
  xpEarned: number;
  levelUpTo: number | null;
  message: string;
  onContinue: () => void;
}) {
  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onContinue}>
      <View style={styles.scrim}>
        {visible ? <Confetti /> : null}
        <View style={styles.card}>
          <PopIn>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark" size={44} color={colors.onColor} />
            </View>
          </PopIn>
          <AppText variant="title" style={styles.centered}>
            Сайн байна!
          </AppText>
          <PopIn>
            <AppText testID="xp-earned" variant="display" color={colors.goldDark}>
              +{xpEarned} XP
            </AppText>
          </PopIn>
          {levelUpTo ? (
            <AppText variant="heading" color={colors.primaryDark} style={styles.centered}>
              Түвшин {levelUpTo}-д хүрлээ!
            </AppText>
          ) : null}
          <AppText color={colors.inkMuted} style={styles.centered}>
            {message}
          </AppText>
          <View style={styles.actions}>
            <GameButton testID="continue-button" label="Үргэлжлүүлэх" onPress={onContinue} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <AppText variant="title" style={styles.centered}>
            {title}
          </AppText>
          <AppText color={colors.inkMuted} style={styles.centered}>
            {message}
          </AppText>
          <View style={styles.actions}>
            <GameButton testID="confirm-cancel" label={cancelLabel} onPress={onCancel} />
            <GameButton testID="confirm-ok" variant="secondary" label={confirmLabel} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const TOAST_MS = 2400;

export function useToast() {
  const [message, setMessage] = useState<{ text: string; icon: IconName } | null>(null);
  const opacity = useAnimatedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, icon: IconName) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage({ text, icon });
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver }).start(() => setMessage(null));
      }, TOAST_MS);
    },
    [opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toast = message ? (
    <Animated.View
      testID="toast"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <Ionicons name={message.icon} size={18} color={colors.onColor} />
      <AppText variant="caption" color={colors.onColor} style={styles.toastText}>
        {message.text}
      </AppText>
    </Animated.View>
  ) : null;

  return { show, toast };
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  centered: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  successBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: { position: 'absolute', top: 0, width: 10, height: 16, borderRadius: 3 },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toastText: { flex: 1 },
});
