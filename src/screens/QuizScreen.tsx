import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti, ConfirmDialog, PopIn } from '@/components/overlays';
import { AppText, Column, GameButton, IconButton, ProgressBar, type IconName } from '@/components/ui';
import { goBackToPath } from '@/lib/navigation';
import type { PathItem, Question } from '@/domain/types';
import { useProgressStore, type Reward } from '@/store/progressStore';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme';

type QuizItem = Extract<PathItem, { kind: 'quiz' }>;
type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const optionStyles: Record<OptionState, { background: string; border: string; icon?: IconName; iconColor?: string }> = {
  idle: { background: colors.surface, border: colors.border },
  selected: { background: colors.primaryTint, border: colors.primary },
  correct: { background: colors.successTint, border: colors.success, icon: 'checkmark-circle', iconColor: colors.successDark },
  wrong: { background: colors.dangerTint, border: colors.danger, icon: 'close-circle', iconColor: colors.dangerDark },
  dimmed: { background: colors.surface, border: colors.border },
};

function getOptionState(index: number, question: Question, selected: number | null, checked: boolean): OptionState {
  if (!checked) return index === selected ? 'selected' : 'idle';
  if (index === question.answerIndex) return 'correct';
  return index === selected ? 'wrong' : 'dimmed';
}

function AnswerOption({ text, state, disabled, onPress, testID }: {
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
        { backgroundColor: look.background, borderColor: look.border, opacity: state === 'dimmed' ? 0.55 : 1 },
      ]}
    >
      <AppText variant="heading" style={styles.optionText}>
        {text}
      </AppText>
      {look.icon ? <Ionicons name={look.icon} size={26} color={look.iconColor} /> : null}
    </Pressable>
  );
}

type Attempt = Reward & { passed: boolean; correct: number };

function QuizResultView({ item, attempt, onRetry }: { item: QuizItem; attempt: Attempt; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  const total = item.quiz.questions.length;
  const percent = Math.round((attempt.correct / total) * 100);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Column>
        <View style={[styles.resultContent, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.resultMain}>
            <PopIn>
              <View style={[styles.resultBadge, { backgroundColor: attempt.passed ? colors.gold : colors.locked }]}>
                <Ionicons
                  name={attempt.passed ? 'trophy' : 'refresh'}
                  size={48}
                  color={attempt.passed ? colors.onColor : colors.ink}
                />
              </View>
            </PopIn>
            <AppText testID="quiz-result-title" variant="title" style={styles.centered}>
              {attempt.passed ? 'Тэнцлээ!' : 'Дахин оролдоорой'}
            </AppText>
            <AppText testID="quiz-score" variant="display">
              {attempt.correct} / {total}
            </AppText>
            <AppText color={colors.inkMuted} style={styles.centered}>
              {attempt.passed
                ? `${percent}% зөв хариуллаа`
                : `${percent}% зөв. Тэнцэхийн тулд ${item.quiz.passPercent}% хэрэгтэй.`}
            </AppText>
            <View style={styles.xpChip}>
              <Ionicons name="flash" size={20} color={colors.goldDark} />
              <AppText testID="quiz-xp" variant="heading">
                +{attempt.xpEarned} XP
              </AppText>
            </View>
            {attempt.levelUpTo ? (
              <AppText variant="heading" color={colors.primaryDark}>
                Түвшин {attempt.levelUpTo}-д хүрлээ!
              </AppText>
            ) : null}
          </View>
          <View style={styles.resultActions}>
            <GameButton testID="quiz-continue" label="Үргэлжлүүлэх" onPress={goBackToPath} />
            <GameButton testID="quiz-retry" variant="secondary" label="Дахин өгөх" icon="refresh" onPress={onRetry} />
          </View>
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
            checked ? { backgroundColor: isCorrect ? colors.successTint : colors.dangerTint } : null,
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
    borderBottomWidth: 4,
    borderRadius: radius.md,
  },
  optionText: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedbackText: { flex: 1 },
  resultContent: { flex: 1, padding: spacing.xl },
  resultMain: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  resultBadge: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.goldTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resultActions: { gap: spacing.sm },
});
