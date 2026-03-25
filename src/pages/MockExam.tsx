import { useState, useEffect } from 'react';
import { db, type Question } from '../db/db';
import { QuestionCard } from '../components/QuestionCard';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

export const MockExam = () => {
  const navigate = useNavigate();

  // --- スタート画面用 ---
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('random'); // 'random' or 'YYYY-MM'

  // DBから収録年月の一覧を取得
  const questions = useLiveQuery(() => db.questions.toArray()) || [];
  const periods = Array.from(
    new Set(questions.map(q => `${q.year}-${q.month}`))
  ).sort((a, b) => {
    const [aY, aM] = a.split('-').map(Number);
    const [bY, bM] = b.split('-').map(Number);
    return bY * 100 + bM - (aY * 100 + aM); // 降順
  });

  // --- 試験中の状態 ---
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [scoreLog, setScoreLog] = useState<{questionId: number, isCorrect: boolean, scoreWeight: number}[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // 年月のラベル表示用ヘルパー
  const periodLabel = (key: string) => {
    if (key === 'random') return '全範囲からランダム';
    const [y, m] = key.split('-');
    return `${y}年${m}月`;
  };

  // 試験を開始する処理
  const startExam = async () => {
    setIsLoading(true);

    try {
      const allQuestions = await db.questions.toArray();
      let pool: Question[];

      if (selectedPeriod === 'random') {
        pool = allQuestions;
      } else {
        const [year, month] = selectedPeriod.split('-').map(Number);
        pool = allQuestions.filter(q => q.year === year && q.month === month);
      }

      console.log(`[MockExam] selectedPeriod=${selectedPeriod}, pool=${pool.length}, total=${allQuestions.length}`);

      if (pool.length === 0) {
        console.warn('[MockExam] No questions found for selected period');
        setIsLoading(false);
        return;
      }

      // Fisher-Yates shuffle
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const selected = shuffled.slice(0, 40);

      setExamQuestions(selected);
      setCurrentQuestionIndex(0);
      setScoreLog([]);
      setIsFinished(false);
      setIsAnswering(true);
      setIsLoading(false);
      setIsExamStarted(true);
    } catch (error) {
      console.error('[MockExam] Error starting exam:', error);
      setIsLoading(false);
    }
  };

  // 試験をリセットしてスタート画面に戻る
  const backToSetup = () => {
    setIsExamStarted(false);
    setExamQuestions([]);
    setCurrentQuestionIndex(0);
    setScoreLog([]);
    setIsFinished(false);
    setIsAnswering(true);
  };

  useEffect(() => {
    setIsAnswering(true);
  }, [currentQuestionIndex]);

  const handleAnswer = async (isCorrect: boolean) => {
    setIsAnswering(false);

    const q = examQuestions[currentQuestionIndex];
    if (q && q.id) {
      await db.userProgress.put({
        questionId: q.id,
        isCorrect,
        lastAnsweredAt: new Date(),
      });

      setScoreLog(prev => [...prev, {
        questionId: q.id!,
        isCorrect,
        scoreWeight: q.scoreWeight,
      }]);
    }
  };

  const handleNext = () => {
    setIsAnswering(true);
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  // ============================================================
  // レンダリング: スタート画面（試験設定画面）
  // ============================================================
  if (!isExamStarted) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-300">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-full transition-colors text-surface-500"
          aria-label="ホームに戻る"
        >
          <X size={24} />
        </button>

        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-2xl font-black text-surface-800 dark:text-surface-100">模擬試験</h1>
          <p className="text-sm text-surface-500">出題範囲を選んで試験を開始してください</p>
        </div>

        {/* 設定カード */}
        <div className="w-full max-w-sm bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-lg border border-surface-200 dark:border-surface-700 space-y-5">

          <div>
            <label htmlFor="period-select" className="block text-sm font-bold text-surface-700 dark:text-surface-200 mb-2">
              出題範囲
            </label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded-xl px-4 py-3 text-sm font-medium text-surface-800 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
            >
              <option value="random">🎲 全範囲からランダム（40問）</option>
              {periods.map(p => (
                <option key={p} value={p}>
                  📄 {periodLabel(p)}（{questions.filter(q => `${q.year}-${q.month}` === p).length}問）
                </option>
              ))}
            </select>
          </div>

          {/* 選択中の情報 */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800/50">
            <div className="text-xs font-bold text-primary-500 dark:text-primary-400 mb-1">出題内容</div>
            {selectedPeriod === 'random' ? (
              <p key="info-random" className="text-sm text-surface-700 dark:text-surface-300">
                全 {questions.length} 問の中からランダムに <span className="font-bold">40問</span> を出題します。
              </p>
            ) : (
              <p key={`info-${selectedPeriod}`} className="text-sm text-surface-700 dark:text-surface-300">
                <span className="font-bold">{periodLabel(selectedPeriod)}</span> の試験問題
                <span className="font-bold"> {questions.filter(q => `${q.year}-${q.month}` === selectedPeriod).length} 問</span>
                を出題します。
              </p>
            )}
          </div>

          <button
            onClick={startExam}
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? '問題を準備中...' : '試験スタート ⏱️'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // レンダリング: ローディング
  // ============================================================
  if (isLoading) {
    return <div className="p-8 text-center text-surface-500 font-bold animate-pulse">試験問題を生成中...</div>;
  }

  // ============================================================
  // レンダリング: 問題なし
  // ============================================================
  if (examQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full space-y-4">
        <h2 className="text-xl font-bold text-surface-500">問題データがありません</h2>
        <p className="text-sm">設定から問題をインポートしてください。</p>
        <button onClick={() => navigate('/')} className="text-primary-600 font-bold hover:underline">戻る</button>
      </div>
    );
  }

  // ============================================================
  // レンダリング: 試験結果画面
  // ============================================================
  if (isFinished) {
    const totalPossibleScore = scoreLog.reduce((sum, log) => sum + log.scoreWeight, 0);
    const earnedScore = scoreLog.filter(log => log.isCorrect).reduce((sum, log) => sum + log.scoreWeight, 0);
    const finalScore = totalPossibleScore > 0 ? Math.round((earnedScore / totalPossibleScore) * 100) : 0;

    const isPassed = finalScore >= 60;

    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-surface-800 dark:text-surface-100 mb-2">模擬試験 終了</h2>
          {selectedPeriod !== 'random' && (
            <p className="text-sm text-surface-500 font-medium">{periodLabel(selectedPeriod)}</p>
          )}

          <div className={`w-40 h-40 mx-auto rounded-full flex flex-col items-center justify-center shadow-xl border-4 ${isPassed ? 'bg-green-50 border-green-400 text-green-600' : 'bg-red-50 border-red-400 text-red-600'} dark:bg-surface-800`}>
            <span className="text-sm font-bold opacity-80 mb-1">スコア</span>
            <span className="text-5xl font-black">{finalScore}</span>
            <span className="text-xs font-bold mt-1">/ 100</span>
          </div>

          <div className="pt-6">
            <h3 className={`text-2xl font-black ${isPassed ? 'text-green-500' : 'text-red-500'}`}>
              {isPassed ? '🎉 合格判定！' : '💪 もう一息！'}
            </h3>
            <p className="text-surface-500 mt-2 text-sm leading-relaxed">
              全 {examQuestions.length} 問中、{scoreLog.filter(l => l.isCorrect).length} 問正解しました。<br/>
              （配点ウエイトを加味して算出したスコアです）
            </p>
          </div>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={startExam}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            もう一度この条件で受ける
          </button>
          <button
            onClick={backToSetup}
            className="w-full bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 font-bold text-lg py-4 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 transition-all active:scale-95"
          >
            別の年度を選ぶ
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full text-surface-500 font-medium text-sm py-3 hover:underline transition-all"
          >
            ホームへ戻る
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // レンダリング: 試験中
  // ============================================================
  const question = examQuestions[currentQuestionIndex];

  // questionが存在しない場合のガード
  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full space-y-4">
        <h2 className="text-xl font-bold text-surface-500">問題の読み込みに失敗しました</h2>
        <button onClick={backToSetup} className="text-primary-600 font-bold hover:underline">戻る</button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col relative bg-blue-50/30 dark:bg-blue-900/10">
      {/* 模擬試験用の上部プログレスバー */}
      <div className="h-1.5 bg-surface-200 dark:bg-surface-700 w-full fixed top-0 max-w-md z-10">
        <div
          className="h-full bg-primary-600 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / examQuestions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
           <button
             onClick={() => {
               if (window.confirm('模擬試験を中断してホームに戻りますか？（現在の回答は保存されません）')) {
                 navigate('/');
               }
             }}
             className="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-full transition-colors text-surface-500"
             aria-label="中断してホームに戻る"
           >
             <X size={24} />
           </button>
           <div className="flex items-center gap-2">
            <span className="text-primary-600 font-bold text-sm sm:text-base">⏱️ 模擬試験</span>
            <span className="text-sm font-medium text-surface-500 bg-white dark:bg-surface-800 px-2 py-0.5 rounded-full border border-surface-200 dark:border-surface-700">
              {currentQuestionIndex + 1} / {examQuestions.length}
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
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            {currentQuestionIndex < examQuestions.length - 1 ? '次の問題へ →' : '結果を見る'}
          </button>
        </div>
      )}
    </div>
  );
};
