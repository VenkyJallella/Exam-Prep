import { useState } from 'react';
import type { AnswerResult } from '@/lib/api/practice';

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  options: Record<string, string>;
  selectedAnswer: string[] | null;
  result: AnswerResult | null;
  onSubmitAnswer: (selected: string[]) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  imageUrl?: string | null;
}

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  questionText,
  options,
  selectedAnswer,
  result,
  onSubmitAnswer,
  onNext,
  onPrev,
  isFirst,
  isLast,
  isSubmitting,
  imageUrl,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string[]>(selectedAnswer || []);
  const isAnswered = result !== null;

  const handleOptionClick = (key: string) => {
    if (isAnswered) return;
    setSelected([key]);
  };

  const handleSubmit = () => {
    if (selected.length === 0 || isAnswered) return;
    onSubmitAnswer(selected);
  };

  const getOptionStyle = (key: string) => {
    const base = 'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all';

    if (!isAnswered) {
      if (selected.includes(key)) {
        return `${base} border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20`;
      }
      return `${base} border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800`;
    }

    // After answer
    if (result?.correct_answer.includes(key)) {
      return `${base} border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-900/20`;
    }
    if (selected.includes(key) && !result?.is_correct) {
      return `${base} border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-900/20`;
    }
    return `${base} border-gray-200 opacity-60 dark:border-gray-700`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          {isAnswered && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                result?.is_correct
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {result?.is_correct ? `Correct! +${result.xp_earned} XP` : 'Incorrect'}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-1.5 rounded-full bg-primary-500 transition-all"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question text */}
      <div className="card">
        <p className="text-lg font-medium leading-relaxed text-gray-900 dark:text-white">
          {questionText}
        </p>
        {imageUrl && (
          <img src={imageUrl} alt="Question illustration" className="mt-3 max-h-64 rounded-lg border border-gray-200 dark:border-gray-700" />
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {Object.entries(options).map(([key, value]) => (
          <button
            key={key}
            onClick={() => handleOptionClick(key)}
            disabled={isAnswered}
            className={getOptionStyle(key)}
          >
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
              selected.includes(key) && !isAnswered
                ? 'bg-primary-600 text-white'
                : isAnswered && result?.correct_answer.includes(key)
                  ? 'bg-green-600 text-white'
                  : isAnswered && selected.includes(key) && !result?.is_correct
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {key}
            </span>
            <span className="flex-1 pt-1 text-sm text-gray-800 dark:text-gray-200">{value}</span>
          </button>
        ))}
      </div>

      {/* Explanation */}
      {isAnswered && result?.explanation && (
        <div className={`rounded-xl border p-4 ${
          result.is_correct
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
            : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10'
        }`}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Explanation
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{result.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="btn-secondary disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex gap-3">
          {!isAnswered && (
            <button
              onClick={handleSubmit}
              disabled={selected.length === 0 || isSubmitting}
              className="btn-primary disabled:opacity-40"
            >
              {isSubmitting ? 'Checking...' : 'Submit Answer'}
            </button>
          )}
          {isAnswered && (
            <button onClick={onNext} className="btn-primary">
              {isLast ? 'Finish' : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
