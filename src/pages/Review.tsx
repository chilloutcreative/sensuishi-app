import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Question } from '../db/db';
import { QuestionCard } from '../components/QuestionCard';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Review = () => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(true);
  
  // 過去に間違えたことがある（isCorrect: falseの履歴がある）問題IDを取得
  const wrongHistory = useLiveQuery(() => 
    db.userProgress
      .where('isCorrect')
      .equals(0) // boolean はIndexedDBでは 0/1 としてインデックスされることが多いが、dexieではそのまま通ることもある。今回は filter で確実にとる。
      .toArray()
  );

  // dexie-react-hooksのネストしたクエリの代わりに、得られたIDから実データを引く
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWrongQuestions = async () => {
      // isCorrect === false のレコードを取得
      const records = await db.userProgress.filter(p => p.isCorrect === false).toArray();
      // ユニークなquestionIdを抽出
      const uniqueIds = Array.from(new Set(records.map(r => r.questionId)));
      
      if (uniqueIds.length > 0) {
        const questions = await db.questions.where('id').anyOf(uniqueIds).toArray();
        setReviewQuestions(questions);
      } else {
        setReviewQuestions([]);
      }
      setIsLoading(false);
    };

    fetchWrongQuestions();
  }, [wrongHistory]); // 履歴が変わったら再計算（簡易的）


  useEffect(() => {
    setIsAnswering(true);
  }, [currentQuestionIndex]);

  const handleAnswer = async (isCorrect: boolean) => {
    setIsAnswering(false);
    
    // DBに学習履歴を保存
    if (reviewQuestions[currentQuestionIndex]) {
      const q = reviewQuestions[currentQuestionIndex];
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
    setIsAnswering(true);
    if (currentQuestionIndex < reviewQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      alert("本日の復習完了！よく頑張りました。");
      window.history.back();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-surface-500">読み込み中...</div>;
  }

  if (reviewQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full space-y-4">
        <div className="text-6xl text-green-500">🎉</div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-green-500 bg-clip-text text-transparent">
          復習する問題はありません
        </h2>
        <p className="text-surface-500 text-center text-sm">
          現在、あなたの弱点（間違えた問題）は登録されていません。<br/>
          この調子で「学習」を進めましょう！
        </p>
      </div>
    );
  }

  const question = reviewQuestions[currentQuestionIndex];

  return (
    <div className="min-h-full flex flex-col relative bg-red-50/30 dark:bg-red-900/5">
      {/* 弱点克服モード用の上部ヘッダー（赤系） */}
      <div className="h-1 bg-red-200 dark:bg-red-900/30 w-full fixed top-0 max-w-md z-10">
        <div 
          className="h-full bg-red-500 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / reviewQuestions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-red-500"
            aria-label="中断してホームに戻る"
          >
            <X size={24} />
          </button>
          <div className="flex items-center justify-center gap-2">
            <span className="text-red-500 font-bold">🔥 弱点克服</span>
            <span className="text-sm font-medium text-surface-500">
              {currentQuestionIndex + 1} / {reviewQuestions.length}
            </span>
          </div>
          <div className="w-10"></div> {/* レイアウト調整用 */}
        </div>
        
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
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-95"
          >
            次の弱点へ →
          </button>
        </div>
      )}
    </div>
  );
};
