import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { AppText, type IconName } from '@/components/ui';
import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { colors, radius, spacing, useNativeDriver } from '@/theme';

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
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver }).start(() =>
          setMessage(null),
        );
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
  toastText: {
    flex: 1,
  },
});
