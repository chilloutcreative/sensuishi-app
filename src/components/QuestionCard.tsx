import { useState, useEffect } from 'react';
import type { Question } from '../db/db';
import { CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface QuestionCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean) => void;
}

export const QuestionCard = ({ question, onAnswer }: QuestionCardProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // デバッグ: imageUrlの値を確認
  console.log('[QuestionCard] question.id:', question.id, 'imageUrl:', question.imageUrl, 'has imageUrl:', !!question.imageUrl);

  // 親コンポーネントから新しい問題が渡された際に、内部ステートを確実にリセットする
  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
  }, [question.id, question.questionText]);

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    
    setSelectedOption(index);
    setIsAnswered(true);
    
    const isCorrect = index === question.correctOptionIndex;
    onAnswer(isCorrect);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-200">
      {/* 設問ヘッダー部 */}
      <div className="flex items-center justify-between text-sm">
        <span className="bg-surface-200 dark:bg-surface-700 px-3 py-1 rounded-full font-medium text-surface-700 dark:text-surface-200">
          {question.category}
        </span>
        <span className="text-surface-500 font-mono">
          配点: {(question.scoreWeight ?? 0).toFixed(1)}
        </span>
      </div>

      {/* 問題文 */}
      <div className="bg-primary-50 dark:bg-primary-900/10 p-5 pl-6 mt-2 rounded-2xl shadow-sm border-2 border-primary-100 dark:border-primary-900/30 border-l-[6px] border-l-primary-500 relative">
        <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-black text-xl shadow-md border-4 border-white dark:border-surface-900">
          Q
        </div>
        <p className="text-lg leading-relaxed font-bold text-surface-800 dark:text-surface-100 mt-1">
          {question.questionText}
        </p>
        
        {/* 画像があれば表示 */}
        {question.imageUrl && (
          <div className="mt-4 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 shadow-sm">
            <img 
              src={question.imageUrl} 
              alt="問題の図表" 
              className="w-full h-auto object-contain max-h-64"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* 選択肢リスト */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center gap-2 mb-1 ml-1">
          <span className="text-primary-600 dark:text-primary-400 font-bold bg-primary-100 dark:bg-primary-900/30 px-3 py-1 rounded-full text-xs">
            回答を選ぶ
          </span>
          <span className="text-sm text-surface-500 font-medium">正しい選択肢をタップ</span>
        </div>
        {(question.options || []).map((option, index) => {
          const isSelected = selectedOption === index;
          const isCorrectOption = index === question.correctOptionIndex;
          
          let stateStyle = "bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-surface-50 dark:hover:bg-surface-800/80";
          let Icon = null;

          if (isAnswered) {
            if (isCorrectOption) {
              stateStyle = "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500 text-green-900 dark:text-green-100";
              Icon = <CheckCircle2 className="text-green-500 shrink-0" size={24} />;
            } else if (isSelected) {
              stateStyle = "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500 text-red-900 dark:text-red-100";
              Icon = <XCircle className="text-red-500 shrink-0" size={24} />;
            } else {
              stateStyle = "bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 opacity-50";
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleOptionClick(index)}
              disabled={isAnswered}
              className={cn(
                "relative flex items-center p-4 rounded-xl border-2 text-left transition-all duration-200",
                stateStyle,
                isSelected && !isAnswered && "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
              )}
            >
              <span className="font-bold text-surface-400 dark:text-surface-500 mr-3 text-lg shrink-0 w-6 text-center">{index + 1}</span>
              <span className="flex-1 text-base font-medium leading-snug pr-4">{option}</span>
              {Icon && <span className="absolute right-4 animate-in zoom-in">{Icon}</span>}
            </button>
          );
        })}
      </div>

      {/* 解説エリア（回答後に表示） */}
      {isAnswered && (
        <div className="mt-2 p-5 rounded-2xl bg-surface-100 dark:bg-surface-800 border-l-4 border-surface-400 dark:border-surface-600 animate-in slide-in-from-bottom-4 duration-300">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 text-sm font-black">A</span>
            解説
          </h3>
          <p className="text-surface-700 dark:text-surface-200 leading-relaxed mb-4">
            {question.explanation.correctReason}
          </p>
          
          <div className="space-y-3">
            {(question.explanation?.wrongReasons || []).map((reason, index) => {
              if (!reason) return null;
              return (
                <div key={index} className="text-sm bg-white dark:bg-surface-900 p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                  <span className="font-semibold text-surface-500 mb-1 block">選択肢 {index + 1}:</span>
                  <span className="text-surface-600 dark:text-surface-400">{reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
