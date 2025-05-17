// パフォーマンステストの設定

export const PERFORMANCE_THRESHOLDS = {
  // 処理時間の基準値（ミリ秒）
  PROCESSING_TIME: {
    SINGLE_SLIDE: 500,
    SMALL_PPTX: 3000,  // 10スライド以下
    MEDIUM_PPTX: 5000, // 11-50スライド
    LARGE_PPTX: 10000  // 50スライド以上
  },

  // メモリ使用量の上限（MB）
  MEMORY_USAGE: {
    SINGLE_SLIDE: 100,
    LARGE_FILE: 500
  },

  // 精度指標（パーセント）
  ACCURACY: {
    TEXTBOX_OVERFLOW: 1,    // はみ出し率の許容値
    FONT_SIZE_FIT: 95      // フォントサイズの適合率の目標値
  },

  // キャッシュ性能
  CACHE: {
    MIN_HIT_RATE: 80       // 最小キャッシュヒット率（パーセント）
  }
};

// テストデータの設定
export const TEST_CONFIGURATIONS = {
  SLIDE_COUNTS: {
    SMALL: 10,
    MEDIUM: 50,
    LARGE: 100
  },

  TEXT_LENGTHS: {
    SHORT: 100,
    MEDIUM: 500,
    LONG: 1000,
    EXTREME: 5000
  },

  LANGUAGE_PAIRS: [
    { source: 'ja', target: 'en' },
    { source: 'en', target: 'ja' },
    { source: 'ja', target: 'zh' },
    { source: 'en', target: 'zh' }
  ],

  FONTS: {
    ja: ['Meiryo', 'MS Gothic', 'Yu Gothic'],
    en: ['Arial', 'Times New Roman', 'Calibri'],
    zh: ['SimSun', 'Microsoft YaHei', 'SimHei']
  }
};

// テスト用ユーティリティ
export const TEST_UTILS = {
  ITERATIONS: {
    QUICK: 100,    // 高速なテスト用
    STANDARD: 1000, // 標準的なテスト用
    THOROUGH: 5000 // 詳細なテスト用
  },
  
  WARMUP_ITERATIONS: 10, // ウォームアップ用の反復回数
  
  MEASUREMENT_INTERVAL: 100 // メモリ使用量の測定間隔（ミリ秒）
}; 