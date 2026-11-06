import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/feedback/Confetti';
import { LevelUpBanner } from '@/components/feedback/LevelUpBanner';
import { PopIn } from '@/components/feedback/PopIn';
import { RewardTile } from '@/components/feedback/RewardTile';
import { Sunburst } from '@/components/feedback/Sunburst';
import { GameIcon } from '@/components/GameIcon';
import { OctoMark } from '@/components/OctoMark';
import { AppText, Column, GameButton } from '@/components/ui';
import { findNextPathItem } from '@/domain/course';
import { getStreak } from '@/domain/progress';
import { goBackToPath } from '@/lib/navigation';
import { useProgress } from '@/store/progressStore';
import { cardShadow, colors, radius, spacing } from '@/theme';

import { ScoreRing } from './ScoreRing';
import type { QuizAttempt, QuizItem } from './types';

const SHORT_SCREEN_HEIGHT = 700;

interface QuizResultViewProps {
  item: QuizItem;
  attempt: QuizAttempt;
  onRetry: () => void;
}

export function QuizResultView({ item, attempt, onRetry }: QuizResultViewProps) {
  const insets = useSafeAreaInsets();
  const streak = getStreak(useProgress().xpByDay, new Date());
  const total = item.quiz.questions.length;
  const percent = Math.round((attempt.correct / total) * 100);
  const nextItem = findNextPathItem(item.id);
  // Short phones give the space to the score and rewards.
  const isShort = useWindowDimensions().height < SHORT_SCREEN_HEIGHT;

  const passMessage =
    nextItem && !nextItem.unit.comingSoon
      ? `${item.unit.title} дууслаа. ${nextItem.unit.title} нээгдлээ!`
      : `${item.unit.title} дууслаа. Курсээ бүрэн дуусгалаа!`;

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.resultHero,
          {
            height: (isShort ? 120 : 208) + insets.top,
            paddingTop: insets.top,
            backgroundColor: attempt.passed ? colors.goldTint : colors.primaryTint,
          },
        ]}
      >
        {attempt.passed && <Sunburst />}
        <PopIn>
          {attempt.passed ? (
            <GameIcon name="trophy" size={isShort ? 88 : 132} />
          ) : (
            <OctoMark size={isShort ? 64 : 96} />
          )}
        </PopIn>
      </View>

      <Column>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <View style={styles.resultHeading}>
            <AppText testID="quiz-result-title" variant="title" style={styles.centered}>
              {attempt.passed ? 'Тэнцлээ!' : 'Дахин оролдоорой'}
            </AppText>
            <AppText color={colors.inkMuted} style={styles.centered}>
              {attempt.passed ? passMessage : 'Хичээлээ эргэн санаад дахин өгөөрэй, та чадна!'}
            </AppText>
          </View>

          <View style={styles.scoreCard}>
            <ScoreRing
              ratio={attempt.correct / total}
              color={attempt.passed ? colors.success : colors.danger}
            >
              <AppText variant="heading">{percent}%</AppText>
            </ScoreRing>
            <View style={styles.scoreText}>
              <AppText testID="quiz-score" variant="title">
                {attempt.correct} / {total}
              </AppText>
              <AppText variant="caption">зөв хариулт</AppText>
              <AppText
                variant="caption"
                color={attempt.passed ? colors.successDark : colors.dangerDark}
                style={styles.scoreStatus}
              >
                {attempt.passed ? 'Тэнцсэн' : 'Тэнцээгүй'} · Хязгаар {item.quiz.passPercent}%
              </AppText>
            </View>
          </View>

          {attempt.passed && (
            <View style={styles.rewardRow}>
              {attempt.xpEarned > 0 && (
                <RewardTile
                  testID="quiz-xp"
                  icon="bolt"
                  value={`+${attempt.xpEarned} XP`}
                  label="Оноо"
                  background={colors.goldTint}
                />
              )}
              <RewardTile
                testID="quiz-streak"
                icon="flame"
                value={`${streak} өдөр`}
                label="Цуваа"
                background={colors.flameTint}
              />
            </View>
          )}

          {attempt.levelUpTo !== null && <LevelUpBanner level={attempt.levelUpTo} icon="medal" />}
        </ScrollView>

        <View style={[styles.resultActions, { paddingBottom: insets.bottom + spacing.lg }]}>
          {attempt.passed ? (
            <>
              <GameButton testID="quiz-continue" label="Үргэлжлүүлэх" onPress={goBackToPath} />
              <GameButton
                testID="quiz-retry"
                variant="secondary"
                label="Дахин өгөх"
                icon="refresh"
                onPress={onRetry}
              />
            </>
          ) : (
            <>
              <GameButton testID="quiz-retry" label="Дахин өгөх" icon="refresh" onPress={onRetry} />
              <GameButton
                testID="quiz-continue"
                variant="secondary"
                label="Зам руу буцах"
                onPress={goBackToPath}
              />
            </>
          )}
        </View>
      </Column>
      {attempt.passed && <Confetti />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  resultHero: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resultContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  resultHeading: {
    gap: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...cardShadow,
  },
  scoreText: {
    flex: 1,
  },
  scoreStatus: {
    marginTop: spacing.xs,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
