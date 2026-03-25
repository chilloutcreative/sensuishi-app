import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { db } from '../db/db';

export const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // DBからデータを取得
  const totalQuestions = useLiveQuery(() => db.questions.count()) || 0;
  const questions = useLiveQuery(() => db.questions.toArray()) || [];
  const progressRecords = useLiveQuery(() => db.userProgress.toArray()) || [];

  // 収録されている試験実施年月を抽出
  const periods = Array.from(new Set(questions.map(q => `${q.year}年${q.month}月`))).sort((a, b) => {
    // 比較のために数値化 (例: 2023年4月 -> 202304)
    const getVal = (str: string) => {
      const match = str.match(/(\d+)年(\d+)月/);
      if (match) {
        return parseInt(match[1], 10) * 100 + parseInt(match[2], 10);
      }
      return 0;
    };
    return getVal(b) - getVal(a); // 降順
  });

  // 計算ロジック
  // 1. 学習進捗（一度でも解いたことがある問題数）
  const uniqueAttemptedIds = new Set(progressRecords.map(r => r.questionId));
  const attemptedCount = uniqueAttemptedIds.size;

  // 2. 直近の正答率（最新の回答結果のみで計算）
  let latestCorrectCount = 0;
  const latestRecordsMap = new Map<number, boolean>();
  progressRecords.forEach(record => {
    // 常に最新で上書きするため、IDをキーにする
    latestRecordsMap.set(record.questionId, record.isCorrect);
  });
  
  latestRecordsMap.forEach(isCorrect => {
    if (isCorrect) latestCorrectCount++;
  });
  
  const accuracy = attemptedCount > 0 
    ? Math.round((latestCorrectCount / attemptedCount) * 100) 
    : 0;

  // 3. 現在の予想スコア（配点考慮）
  // 100点満点換算: 現在の(正解した問題の配点合計 / トータル問題の配点合計) * 100
  let totalScoreWeight = 0;
  let earnedScoreWeight = 0;

  questions.forEach(q => {
    totalScoreWeight += q.scoreWeight;
    if (latestRecordsMap.get(q.id!) === true) {
      earnedScoreWeight += q.scoreWeight;
    }
  });

  const predictedScore = totalScoreWeight > 0 
    ? Math.round((earnedScoreWeight / totalScoreWeight) * 100) 
    : 0;

  // 4. 直近7日間の学習データ集計（グラフ用）
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0); // その日の0時に設定
    return {
      date: d,
      name: `${d.getMonth() + 1}/${d.getDate()}`,
      count: 0
    };
  });

  progressRecords.forEach(record => {
    // record.lastAnsweredAt がもし文字列等ならDateにパースする保護
    const recordDate = new Date(record.lastAnsweredAt);
    recordDate.setHours(0, 0, 0, 0);
    
    // 直近7日間に合致するか探す
    const targetDay = last7DaysData.find(d => d.date.getTime() === recordDate.getTime());
    if (targetDay) {
      targetDay.count++;
    }
  });

  // 今日の学習数
  const todayCount = last7DaysData[6].count;

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      
      <header>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400">
              潜水士パス
            </h1>
            <p className="text-surface-500 mt-1">現場のスキマ時間を合格スコアに</p>
          </div>
          <div className="text-right flex flex-col items-end justify-start pt-2">
             <div className="text-[10px] text-surface-400 font-bold mb-1">収録問題</div>
             
             {/* 改善版: モーダルを開くボタン */}
             <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold bg-white dark:bg-surface-800 text-primary-600 dark:text-primary-400 px-2.5 py-1.5 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 hover:bg-primary-50 dark:hover:bg-surface-700 transition-colors"
             >
               {periods.length > 0 ? `${periods.length}回分` : '読み込み中'}
               <span className="text-[8px]">▼</span>
             </button>
             
          </div>
        </div>
      </header>

      {/* 改善版: 問題一覧のモーダル表示 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-surface-100 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-800/80">
              <h3 className="font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
                <span>📚</span> 収録されている試験一覧
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-200 dark:bg-surface-700 text-surface-500 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {periods.length > 0 ? (
                <div className="space-y-3">
                   <div className="grid grid-cols-2 gap-2">
                     {periods.map(period => (
                       <div key={period} className="text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-3 py-2 rounded-lg border border-primary-100 dark:border-primary-800/50 text-center">
                         {period}
                       </div>
                     ))}
                   </div>
                   <div className="text-center pt-3 border-t border-surface-100 dark:border-surface-700 mt-4">
                     <span className="text-sm text-surface-500">合計: <span className="font-bold text-surface-700 dark:text-surface-300">{questions.length}</span> 問</span>
                   </div>
                </div>
              ) : (
                <p className="text-center text-surface-500 py-4">データがありません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* スコア・進捗ダッシュボード */}
      <section className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* 装飾用の背景円 */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        
        <h2 className="text-primary-100 font-medium text-sm mb-1">現在の予想スコア</h2>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-5xl font-black tracking-tighter">{predictedScore || '--'}</span>
          <span className="text-primary-200 font-bold">/ 100</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-primary-100 mb-1">学習進捗</div>
            <div className="font-bold text-lg">{attemptedCount} / {totalQuestions} <span className="text-sm font-normal opacity-80">問</span></div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-primary-100 mb-1">直近正答率</div>
            <div className="font-bold text-lg">{accuracy}%</div>
          </div>
        </div>
      </section>

      {/* 学習グラフセクション */}
      <section className="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-surface-200 dark:border-surface-700">
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-bold text-lg text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <span>📈</span> 今日の学習
          </h2>
          <div className="text-right">
            <span className="text-3xl font-black text-primary-600 dark:text-primary-400">{todayCount}</span>
            <span className="text-sm text-surface-500 ml-1 font-bold">問</span>
          </div>
        </div>
        
        <div className="h-40 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7DaysData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: any) => [`${value} 問`, '学習数']}
              />
              <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                 {
                  last7DaysData.map((_, index) => (
                    // 今日の棒グラフだけ濃い色にする
                    <Cell key={`cell-${index}`} fill={index === 6 ? '#0ea5e9' : '#bae6fd'} className="dark:fill-primary-500 dark:opacity-80" />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* クイックアクション */}
      <section className="space-y-4">
        <h2 className="font-bold text-lg text-surface-800 dark:text-surface-100 flex items-center gap-2">
          <span>🎯</span> 今日のアクション
        </h2>
        
        <Link 
          to="/study" 
          className="flex items-center justify-between bg-white dark:bg-surface-800 p-5 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-500 transition-all group"
        >
          <div>
            <h3 className="font-bold text-surface-900 dark:text-surface-50 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400">ランダム学習</h3>
            <p className="text-sm text-surface-500">収録問題からランダムに出題します</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
            →
          </div>
        </Link>

        <Link 
          to="/mock-exam" 
          className="flex items-center justify-between bg-white dark:bg-surface-800 p-5 rounded-2xl shadow-sm border-2 border-primary-500 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="font-bold text-primary-600 dark:text-primary-400 mb-1">模擬試験（全40問）</h3>
            <p className="text-sm text-surface-500">本番と同じ問題数でスコア測定します</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold shadow-md shadow-primary-500/30 relative z-10 group-hover:scale-110 transition-transform">
            ⏱️
          </div>
        </Link>

        <Link 
          to="/review" 
          className="flex items-center justify-between bg-white dark:bg-surface-800 p-5 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700 hover:border-red-400 dark:hover:border-red-500 transition-all group"
        >
          <div>
            <h3 className="font-bold text-surface-900 dark:text-surface-50 mb-1 group-hover:text-red-600 dark:group-hover:text-red-400">弱点克服</h3>
            <p className="text-sm text-surface-500">間違えた問題を集中して復習します</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            →
          </div>
        </Link>
      </section>

    </div>
  );
};
