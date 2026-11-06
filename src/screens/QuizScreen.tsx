import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameIcon } from '@/components/GameIcon';
import { OctoMark } from '@/components/OctoMark';
import { Confetti, ConfirmDialog, PopIn, RewardTile, Sunburst } from '@/components/overlays';
import { AppText, Column, GameButton, IconButton, ProgressBar, type IconName } from '@/components/ui';
import { findNextPathItem } from '@/domain/course';
import { getStreak } from '@/domain/progress';
import type { PathItem, Question } from '@/domain/types';
import { goBackToPath } from '@/lib/navigation';
import { useProgress, useProgressStore, type Reward } from '@/store/progressStore';
import { cardShadow, colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme';

type QuizItem = Extract<PathItem, { kind: 'quiz' }>;
type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const RING_SIZE = 92;
const RING_STROKE = 10;
const SHORT_SCREEN_HEIGHT = 700;

type OptionLook = { background: string; border: string; badge: string; badgeText: string; icon?: IconName };

const optionStyles: Record<OptionState, OptionLook> = {
  idle: { background: colors.surface, border: colors.border, badge: colors.primaryTint, badgeText: colors.primaryDark },
  selected: { background: colors.primaryTint, border: colors.primary, badge: colors.primary, badgeText: colors.onColor },
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
  dimmed: { background: colors.surface, border: colors.border, badge: colors.locked, badgeText: colors.lockedInk },
};

function getOptionState(index: number, question: Question, selected: number | null, checked: boolean): OptionState {
  if (!checked) return index === selected ? 'selected' : 'idle';
  if (index === question.answerIndex) return 'correct';
  return index === selected ? 'wrong' : 'dimmed';
}

function AnswerOption({ letter, text, state, disabled, onPress, testID }: {
  letter: string;
  text: string;
  state: OptionState;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
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

type Attempt = Reward & { passed: boolean; correct: number };

function ScoreRing({ ratio, color, children }: { ratio: number; color: string; children: React.ReactNode }) {
  const radiusPx = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const center = RING_SIZE / 2;
  return (
    <View style={styles.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={radiusPx} stroke={colors.track} strokeWidth={RING_STROKE} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radiusPx}
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
}

function QuizResultView({ item, attempt, onRetry }: { item: QuizItem; attempt: Attempt; onRetry: () => void }) {
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
        {attempt.passed ? <Sunburst /> : null}
        <PopIn>
          {attempt.passed ? <GameIcon name="trophy" size={isShort ? 88 : 132} /> : <OctoMark size={isShort ? 64 : 96} />}
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
            <ScoreRing ratio={attempt.correct / total} color={attempt.passed ? colors.success : colors.danger}>
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

          {attempt.passed ? (
            <View style={styles.rewardRow}>
              {attempt.xpEarned > 0 ? (
                <RewardTile
                  testID="quiz-xp"
                  icon="bolt"
                  value={`+${attempt.xpEarned} XP`}
                  label="Оноо"
                  background={colors.goldTint}
                />
              ) : null}
              <RewardTile
                testID="quiz-streak"
                icon="flame"
                value={`${streak} өдөр`}
                label="Цуваа"
                background={colors.flameTint}
              />
            </View>
          ) : null}

          {attempt.levelUpTo ? (
            <View style={styles.levelUp}>
              <GameIcon name="medal" size={28} />
              <AppText variant="heading" color={colors.primaryDark}>
                Түвшин {attempt.levelUpTo}-д хүрлээ!
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.resultActions, { paddingBottom: insets.bottom + spacing.lg }]}>
          {attempt.passed ? (
            <>
              <GameButton testID="quiz-continue" label="Үргэлжлүүлэх" onPress={goBackToPath} />
              <GameButton testID="quiz-retry" variant="secondary" label="Дахин өгөх" icon="refresh" onPress={onRetry} />
            </>
          ) : (
            <>
              <GameButton testID="quiz-retry" label="Дахин өгөх" icon="refresh" onPress={onRetry} />
              <GameButton testID="quiz-continue" variant="secondary" label="Зам руу буцах" onPress={goBackToPath} />
            </>
          )}
        </View>
      </Column>
      {attempt.passed ? <Confetti /> : null}
    </View>
  );
}

function QuizRunner({ item, onFinish }: { item: QuizItem; onFinish: (correct: number) => void }) {
  const insets = useSafeAreaInsets();
  const { questions } = item.quiz;
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const isCorrect = selected === question.answerIndex;

  // The hardware back button goes through the same confirmation as the close button.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setConfirmingExit(true);
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  const handleCheck = () => {
    setChecked(true);
    if (isCorrect) setCorrectCount((count) => count + 1);
  };

  const handleNext = () => {
    if (isLast) {
      onFinish(correctCount);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setChecked(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Column>
        <View style={styles.header}>
          <IconButton testID="quiz-close" icon="close" label="Шалгалтаас гарах" onPress={() => setConfirmingExit(true)} />
          <ProgressBar testID="quiz-progress" value={(index + (checked ? 1 : 0)) / questions.length} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <AppText testID="quiz-position" variant="label">
            АСУУЛТ {index + 1} / {questions.length}
          </AppText>
          <AppText testID="quiz-question" variant="title">
            {question.text}
          </AppText>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {question.options.map((option, optionIndex) => (
              <AnswerOption
                key={option}
                testID={`option-${optionIndex}`}
                letter={OPTION_LETTERS[optionIndex]}
                text={option}
                state={getOptionState(optionIndex, question, selected, checked)}
                disabled={checked}
                onPress={() => setSelected(optionIndex)}
              />
            ))}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + spacing.lg },
            { backgroundColor: !checked ? colors.surface : isCorrect ? colors.successTint : colors.dangerTint },
          ]}
        >
          {checked ? (
            <View accessibilityLiveRegion="polite" style={styles.feedback}>
              <Ionicons
                name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={28}
                color={isCorrect ? colors.successDark : colors.dangerDark}
              />
              <AppText testID="quiz-feedback" variant="heading" style={styles.feedbackText}>
                {isCorrect ? 'Зөв!' : `Буруу. Зөв хариулт: ${question.options[question.answerIndex]}`}
              </AppText>
            </View>
          ) : null}
          {checked ? (
            <GameButton testID="quiz-next" label={isLast ? 'Дүн харах' : 'Дараах'} onPress={handleNext} />
          ) : (
            <GameButton testID="quiz-check" label="Шалгах" disabled={selected === null} onPress={handleCheck} />
          )}
        </View>
      </Column>

      <ConfirmDialog
        visible={confirmingExit}
        title="Шалгалтаас гарах уу?"
        message="Энэ оролдлогын хариултууд хадгалагдахгүй."
        cancelLabel="Үргэлжлүүлэх"
        confirmLabel="Гарах"
        onCancel={() => setConfirmingExit(false)}
        onConfirm={() => {
          setConfirmingExit(false);
          goBackToPath();
        }}
      />
    </View>
  );
}

export function QuizScreen({ item }: { item: QuizItem }) {
  const submitQuiz = useProgressStore((state) => state.submitQuiz);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [runKey, setRunKey] = useState(0);

  if (attempt) {
    return (
      <QuizResultView
        item={item}
        attempt={attempt}
        onRetry={() => {
          setAttempt(null);
          setRunKey((key) => key + 1);
        }}
      />
    );
  }

  return (
    <QuizRunner
      key={runKey}
      item={item}
      onFinish={(correct) => setAttempt({ ...submitQuiz(item.quiz, correct), correct })}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.sm, paddingRight: spacing.lg, minHeight: 52 },
  content: { padding: spacing.lg, gap: spacing.md },
  options: { gap: spacing.md, marginTop: spacing.sm },
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
  optionBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedbackText: { flex: 1 },
  resultHero: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  resultContent: { padding: spacing.lg, gap: spacing.md },
  resultHeading: { gap: spacing.xs },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...cardShadow,
  },
  scoreText: { flex: 1 },
  scoreStatus: { marginTop: spacing.xs },
  rewardRow: { flexDirection: 'row', gap: spacing.sm },
  levelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
  },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  resultActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
