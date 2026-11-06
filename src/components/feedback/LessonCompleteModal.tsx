import { Modal, StyleSheet, View } from 'react-native';

import { GameIcon } from '@/components/GameIcon';
import { AppText, GameButton } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { Confetti } from './Confetti';
import { LevelUpBanner } from './LevelUpBanner';
import { PopIn } from './PopIn';
import { RewardTile } from './RewardTile';
import { Sunburst } from './Sunburst';

interface LessonCompleteModalProps {
  visible: boolean;
  xpEarned: number;
  streak: number;
  levelUpTo: number | null;
  /** The stop this lesson just unlocked. */
  nextTitle: string | null;
  onContinue: () => void;
}

export function LessonCompleteModal({
  visible,
  xpEarned,
  streak,
  levelUpTo,
  nextTitle,
  onContinue,
}: LessonCompleteModalProps) {
  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View style={styles.scrim}>
        {visible && <Confetti />}
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
            {nextTitle !== null && (
              <AppText color={colors.inkMuted} style={styles.centered}>
                Дараагийн алхам: {nextTitle}
              </AppText>
            )}

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

            {levelUpTo !== null && <LevelUpBanner level={levelUpTo} icon="trophy" />}

            <View style={styles.actions}>
              <GameButton testID="continue-button" label="Үргэлжлүүлэх" onPress={onContinue} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
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
  rewardBody: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
