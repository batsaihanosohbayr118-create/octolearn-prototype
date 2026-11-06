import { useState } from 'react';

import { QuizResultView } from '@/components/quiz/QuizResultView';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import type { QuizAttempt, QuizItem } from '@/components/quiz/types';
import { useProgressStore } from '@/store/progressStore';

export function QuizScreen({ item }: { item: QuizItem }) {
  const submitQuiz = useProgressStore((state) => state.submitQuiz);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
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
