import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { db, type Question } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

export const Settings = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  const questions = useLiveQuery(() => db.questions.toArray()) || [];
  
  // 収録されている試験実施年月を抽出
  const periods = Array.from(new Set(questions.map(q => `${q.year}年${q.month}月`))).sort((a, b) => {
    const getVal = (str: string) => {
      const match = str.match(/(\d+)年(\d+)月/);
      if (match) {
        return parseInt(match[1], 10) * 100 + parseInt(match[2], 10);
      }
      return 0;
    };
    return getVal(b) - getVal(a); // 降順
  });

  const handleClearHistory = async () => {
    if (window.confirm('学習履歴を全て削除しますか？\n（問題データは消えません）')) {
      try {
        await db.userProgress.clear();
        alert('学習履歴をクリアしました。');
      } catch (error) {
        console.error('Failed to clear history:', error);
        alert('学習履歴のクリアに失敗しました。');
      }
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('【警告】問題データを含め、すべてのデータを削除しますか？\n（インポートした問題もすべて消去されます）')) {
      try {
        await db.userProgress.clear();
        await db.questions.clear();
        alert('すべてのデータを削除しました。');
      } catch (error) {
        console.error('Failed to clear all data:', error);
        alert('データの削除に失敗しました。');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('読み込み中...');

    Papa.parse(file, {
      header: true, // 1行目をヘッダーとして扱う
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newQuestions: Question[] = results.data.map((row: any) => {
            // CSVのカラム名と突き合わせる（※要件にあわせて調整）
            const options = [
              row['選択肢1'],
              row['選択肢2'],
              row['選択肢3'],
              row['選択肢4'],
              row['選択肢5']
            ].filter(Boolean); // 空の選択肢を除外

            const wrongReasons = [
              row['解説_選択肢1'],
              row['解説_選択肢2'],
              row['解説_選択肢3'],
              row['解説_選択肢4'],
              row['解説_選択肢5']
            ];

            return {
              year: parseInt(row['年度'], 10) || new Date().getFullYear(),
              month: parseInt(row['月'], 10) || 1,
              category: row['分野'],
              scoreWeight: parseFloat(row['配点']) || 2.0,
              questionText: row['問題文'],
              options: options,
              // 正解番号は1始まりの想定。配列インデックスに合わせるため -1
              correctOptionIndex: (parseInt(row['正解番号'], 10) || 1) - 1,
              explanation: {
                correctReason: row['正解の解説'] || '',
                wrongReasons: wrongReasons
              }
            } as Question;
          });

          // DBへトランザクションでバルクインサート
          await db.questions.bulkAdd(newQuestions);
          
          setImportStatus(`成功: ${newQuestions.length}問のインポートを完了しました！`);
          if (fileInputRef.current) fileInputRef.current.value = ''; // リセット
        } catch (error) {
          console.error("Import error:", error);
          setImportStatus('インポートに失敗しました。CSVのフォーマットを確認してください。');
        }
      },
      error: (error) => {
        console.error("Parse error:", error);
        setImportStatus('CSVファイルの読み込みエラーが発生しました。');
      }
    });
  };

  const downloadTemplate = () => {
    // インポート用CSVのテンプレート（ヘッダー行＋ダミー1行）を生成してダウンロード
    const headers = ["年度", "月", "分野", "配点", "問題文", "選択肢1", "選択肢2", "選択肢3", "選択肢4", "選択肢5", "正解番号", "正解の解説", "解説_選択肢1", "解説_選択肢2", "解説_選択肢3", "解説_選択肢4", "解説_選択肢5"];
    
    // サンプルデータ
    const sampleRow = [
      "2023", "4", "潜水業務", "3.0", 
      "水圧の計算として正しいものはどれか。", 
      "誤った選択肢A", "正解の選択肢B", "誤った選択肢C", "誤った選択肢D", "誤った選択肢E", 
      "2", // 選択肢2が正解
      "水深10mで1気圧増えるためBが正解です。", 
      "Aはゲージ圧のみです。", "", "Cは単位が異なります。", "Dは計算式が誤りです。", "Eは論外です。"
    ];

    const csvContent = headers.join(",") + "\n" + sampleRow.map(v => `"${v}"`).join(",");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "question_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>
      
      {/* 問題データ管理セクション */}
      <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-surface-200 dark:border-surface-700 space-y-4">
        <h2 className="font-semibold text-surface-500 flex items-center gap-2">
          <span>📚</span> 問題データの管理
        </h2>
        
        <div className="space-y-3">
          <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
            CSVファイルから独自の過去問題やオリジナル問題を追加できます。
          </p>

          <div className="bg-surface-50 dark:bg-surface-700/50 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            {/* 改善版: アコーディオンのヘッダー（クリックで開閉） */}
            <button 
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full flex justify-between items-center p-3 sm:p-4 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700/80 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-bold text-surface-800 dark:text-surface-100">現在収録されている試験問題</div>
                <div className="text-xs text-surface-500 mt-0.5">全 {periods.length} 回分 / 合計 {questions.length} 問</div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-surface-100 dark:bg-surface-700 text-surface-500 transition-transform duration-300 ${isAccordionOpen ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </button>
            
            {/* 展開される中身 */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isAccordionOpen ? 'max-h-[500px] opacity-100 border-t border-surface-200 dark:border-surface-600' : 'max-h-0 opacity-0'}`}
            >
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {periods.length > 0 ? (
                    periods.map(period => (
                      <span key={period} className="text-xs sm:text-sm font-medium bg-white dark:bg-surface-600 text-surface-700 dark:text-surface-200 px-3 py-2 rounded-lg shadow-sm border border-surface-200 dark:border-surface-500 text-center">
                        {period}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-surface-400 col-span-2 text-center py-2">問題がありません</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={downloadTemplate}
            className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline p-1"
          >
            ↓ テンプレートCSVをダウンロード
          </button>
          
          <div className="mt-2">
            <input 
              type="file" 
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label 
              htmlFor="csv-upload"
              className="block w-full text-center bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-bold py-3 px-4 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700/50 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              CSVファイルを選択してインポート
            </label>
          </div>
          
          {importStatus && (
            <p className={`text-sm font-medium ${importStatus.includes('成功') ? 'text-green-600' : 'text-surface-600 dark:text-surface-400'}`}>
              {importStatus}
            </p>
          )}

          <div className="pt-2 border-t border-surface-200 dark:border-surface-700 mt-4">
             <button 
                onClick={handleClearAllData}
                className="w-full text-red-600 p-2 text-sm font-medium rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                登録済みの「全問題と履歴」を初期化
              </button>
          </div>
        </div>
      </div>

      {/* 学習データ管理セクション */}
      <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-sm border border-surface-200 dark:border-surface-700 space-y-4">
        <h2 className="font-semibold text-surface-500 flex items-center gap-2">
          <span>⚙️</span> アプリデータ
        </h2>
        
        <div className="space-y-2">
          <button 
            className="w-full text-left p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors font-medium border border-surface-200 dark:border-surface-700 flex justify-between items-center"
            onClick={handleClearHistory}
          >
            <span>学習履歴のクリア</span>
            <span className="text-surface-400 text-sm">問題は残ります</span>
          </button>
        </div>

        <div className="pt-4 space-y-1 text-sm text-surface-400">
          <p>潜水士パス 試験対策PWA</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};
