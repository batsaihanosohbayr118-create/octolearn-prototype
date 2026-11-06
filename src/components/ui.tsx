import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type TextProps } from 'react-native';

import { useAnimatedValue } from '@/lib/useAnimatedValue';
import { colors, fonts, MAX_CONTENT_WIDTH, MIN_TOUCH_TARGET, radius, spacing } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const textVariants = StyleSheet.create({
  display: { fontFamily: fonts.black, fontSize: 40, lineHeight: 48, color: colors.ink },
  title: { fontFamily: fonts.black, fontSize: 24, lineHeight: 31, color: colors.ink },
  heading: { fontFamily: fonts.heavy, fontSize: 18, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.ink },
  caption: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  label: { fontFamily: fonts.heavy, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, color: colors.inkMuted },
});

type AppTextProps = TextProps & { variant?: keyof typeof textVariants; color?: string };

export function AppText({ variant = 'body', color, style, ...props }: AppTextProps) {
  return <Text {...props} style={[textVariants[variant], color ? { color } : null, style]} />;
}

/** Centres a phone-width column on tablets and the web. */
export function Column({ children }: { children: ReactNode }) {
  return (
    <View style={styles.columnOuter}>
      <View style={styles.columnInner}>{children}</View>
    </View>
  );
}

const buttonVariants = {
  primary: { face: colors.primary, lip: colors.primaryDark, text: colors.onColor },
  success: { face: colors.success, lip: colors.successDark, text: colors.onColor },
  secondary: { face: colors.surface, lip: colors.border, text: colors.primaryDark },
} as const;

type GameButtonProps = {
  label: string;
  onPress: () => void;
  variant?: keyof typeof buttonVariants;
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
};

export function GameButton({ label, onPress, variant = 'primary', icon, disabled, testID }: GameButtonProps) {
  const palette = buttonVariants[variant];
  const face = disabled ? colors.locked : palette.face;
  const lip = disabled ? colors.lockedDark : palette.lip;
  const text = disabled ? colors.lockedInk : palette.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.buttonLip, { backgroundColor: lip }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.buttonFace,
            { backgroundColor: face, transform: [{ translateY: pressed && !disabled ? 0 : -4 }] },
            variant === 'secondary' && !disabled ? styles.buttonSecondary : null,
          ]}
        >
          {icon ? <Ionicons name={icon} size={20} color={text} /> : null}
          <AppText variant="heading" color={text} style={styles.buttonLabel}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed ? styles.iconButtonPressed : null]}
    >
      <Ionicons name={icon} size={26} color={colors.ink} />
    </Pressable>
  );
}

export function ProgressBar({
  value,
  color = colors.primary,
  height = 12,
  testID,
}: {
  value: number;
  color?: string;
  height?: number;
  testID?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const animated = useAnimatedValue(clamped);

  useEffect(() => {
    // Width is a layout property, which the native driver can't animate.
    Animated.timing(animated, { toValue: clamped, duration: 500, useNativeDriver: false }).start();
  }, [animated, clamped]);

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      style={[styles.barTrack, { height, borderRadius: height / 2 }]}
    >
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: animated.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  columnOuter: { flex: 1, alignItems: 'center' },
  columnInner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  buttonLip: { borderRadius: radius.md, marginTop: 4 },
  buttonFace: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSecondary: { borderWidth: 2, borderColor: colors.border },
  buttonLabel: { textAlign: 'center' },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: { backgroundColor: colors.primaryTint },
  barTrack: { backgroundColor: colors.track, overflow: 'hidden', flexGrow: 1 },
});
