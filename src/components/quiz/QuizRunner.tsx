import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { AppText, Column, GameButton, IconButton, ProgressBar } from '@/components/ui';
import { goBackToPath } from '@/lib/navigation';
import { colors, spacing } from '@/theme';

import { AnswerOption, getOptionState } from './AnswerOption';
import type { QuizItem } from './types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

interface QuizRunnerProps {
  item: QuizItem;
  onFinish: (correct: number) => void;
}

export function QuizRunner({ item, onFinish }: QuizRunnerProps) {
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
          <IconButton
            testID="quiz-close"
            icon="close"
            label="Шалгалтаас гарах"
            onPress={() => setConfirmingExit(true)}
          />
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
            {
              backgroundColor: !checked ? colors.surface : isCorrect ? colors.successTint : colors.dangerTint,
            },
          ]}
        >
          {checked && (
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
          )}
          {checked ? (
            <GameButton testID="quiz-next" label={isLast ? 'Дүн харах' : 'Дараах'} onPress={handleNext} />
          ) : (
            <GameButton
              testID="quiz-check"
              label="Шалгах"
              disabled={selected === null}
              onPress={handleCheck}
            />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    minHeight: 52,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  options: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedbackText: {
    flex: 1,
  },
});
