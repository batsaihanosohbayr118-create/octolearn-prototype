import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, type IconName } from '@/components/ui';
import type { Question } from '@/domain/types';
import { cardShadow, colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme';

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

type OptionLook = { background: string; border: string; badge: string; badgeText: string; icon?: IconName };

const optionStyles: Record<OptionState, OptionLook> = {
  idle: {
    background: colors.surface,
    border: colors.border,
    badge: colors.primaryTint,
    badgeText: colors.primaryDark,
  },
  selected: {
    background: colors.primaryTint,
    border: colors.primary,
    badge: colors.primary,
    badgeText: colors.onColor,
  },
  correct: {
    background: colors.successTint,
    border: colors.success,
    badge: colors.successDark,
    badgeText: colors.onColor,
    icon: 'checkmark',
  },
  wrong: {
    background: colors.dangerTint,
    border: colors.danger,
    badge: colors.dangerDark,
    badgeText: colors.onColor,
    icon: 'close',
  },
  dimmed: {
    background: colors.surface,
    border: colors.border,
    badge: colors.locked,
    badgeText: colors.lockedInk,
  },
};

export function getOptionState(
  index: number,
  question: Question,
  selected: number | null,
  checked: boolean,
): OptionState {
  if (!checked) return index === selected ? 'selected' : 'idle';
  if (index === question.answerIndex) return 'correct';
  return index === selected ? 'wrong' : 'dimmed';
}

interface AnswerOptionProps {
  letter: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}

export function AnswerOption({ letter, text, state, disabled, onPress, testID }: AnswerOptionProps) {
  const look = optionStyles[state];
  const stateLabel = state === 'correct' ? ', зөв хариулт' : state === 'wrong' ? ', буруу' : '';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={text + stateLabel}
      accessibilityState={{ selected: state === 'selected' || state === 'wrong', disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.option,
        { backgroundColor: look.background, borderColor: look.border, opacity: state === 'dimmed' ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.optionBadge, { backgroundColor: look.badge }]}>
        {look.icon ? (
          <Ionicons name={look.icon} size={20} color={look.badgeText} />
        ) : (
          <AppText variant="heading" color={look.badgeText}>
            {letter}
          </AppText>
        )}
      </View>
      <AppText variant="heading" style={styles.optionText}>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: Math.max(MIN_TOUCH_TARGET, 60),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderRadius: radius.md,
    ...cardShadow,
  },
  optionBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
});
