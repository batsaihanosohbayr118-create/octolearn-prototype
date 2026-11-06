import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { colors, radius, spacing, useNativeDriver } from '@/theme';

import { GameIcon } from './GameIcon';
import { AppText, GameButton, type IconName } from './ui';

const CONFETTI_COLORS = [colors.primary, colors.gold, colors.success, colors.danger, colors.primarySoft];
const CONFETTI_COUNT = 28;
const SUNBURST_SIZE = 460;
const SUNBURST_RAYS = 12;

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
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.confettiArea]}>
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

/** Slowly turning rays behind the medal. */
export function Sunburst() {
  const spin = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const center = SUNBURST_SIZE / 2;
  const rays = Array.from({ length: SUNBURST_RAYS }, (_, index) => {
    const angle = (index / SUNBURST_RAYS) * 2 * Math.PI;
    const spread = Math.PI / SUNBURST_RAYS / 2;
    const point = (a: number) => `${center + center * Math.cos(a)} ${center + center * Math.sin(a)}`;
    return `M ${center} ${center} L ${point(angle - spread)} L ${point(angle + spread)} Z`;
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sunburst,
        { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
      ]}
    >
      <Svg width={SUNBURST_SIZE} height={SUNBURST_SIZE}>
        {rays.map((ray) => (
          <Path key={ray} d={ray} fill={colors.gold} opacity={0.22} />
        ))}
      </Svg>
    </Animated.View>
  );
}

export function RewardTile({ icon, value, label, background, testID }: {
  icon: 'bolt' | 'flame';
  value: string;
  label: string;
  background: string;
  testID: string;
}) {
  return (
    <View style={[styles.rewardTile, { backgroundColor: background }]}>
      <PopIn>
        <GameIcon name={icon} size={36} />
      </PopIn>
      <View style={styles.rewardText}>
        <AppText testID={testID} variant="heading" numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

export function LessonCompleteModal({
  visible,
  xpEarned,
  streak,
  levelUpTo,
  nextTitle,
  onContinue,
}: {
  visible: boolean;
  xpEarned: number;
  streak: number;
  levelUpTo: number | null;
  /** The stop this lesson just unlocked. */
  nextTitle: string | null;
  onContinue: () => void;
}) {
  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={onContinue}>
      <View style={styles.scrim}>
        {visible ? <Confetti /> : null}
        <View style={styles.rewardCard}>
          <View style={styles.rewardHero}>
            <Sunburst />
            <PopIn>
              <GameIcon name="medal" size={124} />
            </PopIn>
          </View>

          <View style={styles.rewardBody}>
            <AppText variant="title" style={styles.centered}>
              Хичээл дууслаа!
            </AppText>
            {nextTitle ? (
              <AppText color={colors.inkMuted} style={styles.centered}>
                Дараагийн алхам: {nextTitle}
              </AppText>
            ) : null}

            <View style={styles.rewardRow}>
              <RewardTile
                testID="xp-earned"
                icon="bolt"
                value={`+${xpEarned} XP`}
                label="Оноо"
                background={colors.goldTint}
              />
              <RewardTile
                testID="reward-streak"
                icon="flame"
                value={`${streak} өдөр`}
                label="Цуваа"
                background={colors.flameTint}
              />
            </View>

            {levelUpTo ? (
              <View style={styles.levelUp}>
                <GameIcon name="trophy" size={28} />
                <AppText variant="heading" color={colors.primaryDark}>
                  Түвшин {levelUpTo}-д хүрлээ!
                </AppText>
              </View>
            ) : null}

            <View style={styles.actions}>
              <GameButton testID="continue-button" label="Үргэлжлүүлэх" onPress={onContinue} />
            </View>
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
  rewardCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  rewardHero: {
    height: 172,
    backgroundColor: colors.goldTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sunburst: { position: 'absolute', width: SUNBURST_SIZE, height: SUNBURST_SIZE },
  rewardBody: { padding: spacing.xl, gap: spacing.md },
  rewardRow: { flexDirection: 'row', gap: spacing.sm },
  rewardTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rewardText: { flex: 1 },
  levelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
  },
  confettiArea: { overflow: 'hidden' },
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
