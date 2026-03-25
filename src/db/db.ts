import Dexie, { type Table } from 'dexie';

export interface Question {
  id?: number;
  year: number; // 出題年度（例: 2023）
  month: number; // 出題月（例: 4）
  category: '潜水業務' | '送気、潜降及び浮上' | '高気圧障害' | '関係法令';
  scoreWeight: number; // 傾斜配点（3.0, 2.5, 2.0）
  questionText: string;
  imageUrl?: string; // 追加: 問題文における図表（画像パス）
  options: string[]; // 選択肢の配列
  correctOptionIndex: number; // 正解のインデックス（0始まり）
  explanation: {
    correctReason: string; // なぜ正解か
    wrongReasons: string[]; // なぜ他の選択肢は間違いか（各選択肢に対応）
  };
}

export interface UserProgress {
  questionId: number; // Questionのidと紐付け
  isCorrect: boolean;
  lastAnsweredAt: Date;
  // 将来的な間隔反復（SRS）のためのフィールド
  interval?: number;
  easeFactor?: number;
}

export class SensuishiDatabase extends Dexie {
  questions!: Table<Question, number>;
  userProgress!: Table<UserProgress, number>;

  constructor() {
    super('SensuishiAppDB');
    this.version(1).stores({
      questions: '++id, [year+month], category, scoreWeight',
      userProgress: 'questionId, isCorrect, lastAnsweredAt'
    });
  }
}

export const db = new SensuishiDatabase();

// DB内の重複データを検出・除去する
export const deduplicateQuestions = async () => {
  const allQuestions = await db.questions.toArray();
  const seen = new Map<string, number>(); // key -> 最初に見つかったID
  const idsToDelete: number[] = [];

  for (const q of allQuestions) {
    const key = `${q.year}-${q.month}-${q.questionText}`;
    if (seen.has(key)) {
      // 重複 → 削除対象に追加
      if (q.id) idsToDelete.push(q.id);
    } else {
      seen.set(key, q.id!);
    }
  }

  if (idsToDelete.length > 0) {
    await db.questions.bulkDelete(idsToDelete);
    console.log(`Deduplicated: removed ${idsToDelete.length} duplicate questions. Remaining: ${allQuestions.length - idsToDelete.length}`);
  }
};

// 初期データ投入（DBが空の場合のみ実行）
// React Strict Modeでの二重実行を防ぐためのロック
let _isPopulating = false;

export const populateDummyData = async () => {
  // ロックで二重実行を防止（React Strict Mode/並行呼び出し対策）
  if (_isPopulating) return;
  _isPopulating = true;

  try {
    // まず既存データの重複を除去
    await deduplicateQuestions();

    const count = await db.questions.count();
    if (count > 0) return; // 既にデータがあれば何もしない

    const response = await fetch(`${import.meta.env.BASE_URL}data/initial_questions.json`);
    if (!response.ok) {
      throw new Error('Failed to fetch initial data');
    }
    const initialData: Question[] = await response.json();

    // 重複除去: (year, month, questionText) の組み合わせでユニーク化
    const seen = new Set<string>();
    const uniqueData = initialData.filter(q => {
      const key = `${q.year}-${q.month}-${q.questionText}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 挿入前に再度確認（他のタブ等からの投入を防止）
    const recheck = await db.questions.count();
    if (recheck > 0) return;

    await db.questions.bulkAdd(uniqueData);
    console.log(`Successfully loaded ${uniqueData.length} initial questions.`);
  } catch (error) {
    console.error('Error loading initial data:', error);
  } finally {
    _isPopulating = false;
  }
};
