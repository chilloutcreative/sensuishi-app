import { useState, useEffect } from 'react';
import { db, type Question } from '../db/db';
import { QuestionCard } from '../components/QuestionCard';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Study = () => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(true);
  
  // 新規追加：シャッフル済みの問題を保持するステート
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初回マウント時にDBから全件取得してシャッフルする
  useEffect(() => {
    const fetchAndShuffle = async () => {
      const allQuestions = await db.questions.toArray();
      // フィッシャー・イェーツのシャッフル
      for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
      }
      setShuffledQuestions(allQuestions);
      setIsLoading(false);
    };
    fetchAndShuffle();
  }, []);

  useEffect(() => {
    setIsAnswering(true);
  }, [currentQuestionIndex]);

  const handleAnswer = async (isCorrect: boolean) => {
    setIsAnswering(false);
    
    // DBに学習履歴を保存
    if (shuffledQuestions.length > 0 && shuffledQuestions[currentQuestionIndex]) {
      const q = shuffledQuestions[currentQuestionIndex];
      if (q.id) {
        await db.userProgress.put({
          questionId: q.id,
          isCorrect,
          lastAnsweredAt: new Date(),
        });
      }
    }
  };

  const handleNext = () => {
    setIsAnswering(true); // 明示的にステートをリセット
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      alert("学習完了！ホームに戻ります。");
      window.history.back();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-surface-500">問題を準備中...</div>;
  }

  if (shuffledQuestions.length === 0) {
    return <div className="p-8 text-center text-surface-500">問題データがありません。</div>;
  }

  const question = shuffledQuestions[currentQuestionIndex];

  return (
    <div className="min-h-full flex flex-col relative">
      {/* 上部プログレスバーモック */}
      <div className="h-1 bg-surface-200 dark:bg-surface-700 w-full fixed top-0 max-w-md z-10">
        <div 
          className="h-full bg-primary-500 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-full transition-colors text-surface-500"
            aria-label="中断してホームに戻る"
          >
            <X size={24} />
          </button>
          <div className="text-sm font-medium text-surface-500">
            問 {currentQuestionIndex + 1} / {shuffledQuestions.length}
          </div>
          <div className="w-10"></div> {/* レイアウト調整用 */}
        </div>
        
        {/* レンダリングのキーを設問のIDとインデックスにすることで確実に状態をリセット */}
        <QuestionCard 
          key={`${question.id}-${currentQuestionIndex}`} 
          question={question} 
          onAnswer={handleAnswer} 
        />
      </div>

      {/* 次へボタン領域（下部固定） */}
      {!isAnswering && (
        <div className="fixed bottom-0 w-full max-w-md bg-white/90 dark:bg-surface-800/90 backdrop-blur-md border-t border-surface-200 dark:border-surface-700 p-4 pb-safe animate-in slide-in-from-bottom-5">
          <button
            onClick={handleNext}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            {currentQuestionIndex < shuffledQuestions.length - 1 ? '次の問題へ →' : '学習を終了する'}
          </button>
        </div>
      )}
    </div>
  );
};
