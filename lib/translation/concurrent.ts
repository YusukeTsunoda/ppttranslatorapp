import { withRetry } from './error-handler';

interface TranslationResult {
  original: string;
  translated: string;
}

interface TranslationOptions {
  batchSize?: number;
  concurrency?: number;
  maxRetries?: number;
  translate?: (text: string) => Promise<TranslationResult>;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  memoryLimit?: number;
  onMemoryExceeded?: () => void;
}

/**
 * 複数のテキストを並行して翻訳する
 * @param texts 翻訳対象のテキスト配列
 * @param sourceLanguage ソース言語
 * @param targetLanguage ターゲット言語
 * @param options オプション
 * @returns 翻訳結果の配列
 */
export async function translateConcurrently(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string,
  options: TranslationOptions = {}
): Promise<TranslationResult[]> {
  const {
    batchSize = 10,
    concurrency = 5,
    maxRetries = 3,
    translate = defaultTranslate,
    onProgress,
    signal,
    memoryLimit = 100 * 1024 * 1024, // デフォルト100MB
    onMemoryExceeded,
  } = options;

  // キャンセル時のエラー処理
  if (signal?.aborted) {
    throw new Error('Translation cancelled');
  }
  
  // キャンセルイベントを監視するプロミス
  let cancelPromise: Promise<never> | null = null;
  if (signal) {
    cancelPromise = new Promise<never>((_, reject) => {
      const abortHandler = () => {
        reject(new Error('Translation cancelled'));
      };
      signal.addEventListener('abort', abortHandler);
    });
  }

  // テキストを指定サイズのバッチに分割
  const batches = chunk(texts, batchSize);
  const results: TranslationResult[] = [];
  let completedCount = 0;

  // メモリ使用量の監視を開始
  const memoryWatcher = startMemoryWatcher(memoryLimit, onMemoryExceeded);

  try {
    // バッチごとに並行処理
    for (let i = 0; i < batches.length; i += concurrency) {
      const currentBatches = batches.slice(i, i + concurrency);
      
      // 各バッチを並行して処理
      const batchPromises = currentBatches.map(async (batch) => {
        // キャンセルチェック
        if (signal?.aborted) {
          throw new Error('Translation cancelled');
        }

        // バッチ内の各テキストを処理
        const batchResults = await Promise.all(
          batch.map(async (text) => {
            try {
              // リトライ機能付きで翻訳を実行
              const result = await withRetry(
                () => translate(text),
                maxRetries
              );

              // 進捗を更新
              completedCount++;
              if (onProgress) {
                onProgress(completedCount / texts.length);
              }

              return result;
            } catch (error) {
              console.error(`Failed to translate text: ${text}`, error);
              return null;
            }
          })
        );

        // nullを除外して結果を返す
        return batchResults.filter((result): result is TranslationResult => result !== null);
      });

      // 現在のバッチセットの結果を取得
      const batchPromisesWithCancel = cancelPromise 
        ? [...batchPromises, cancelPromise] 
        : batchPromises;
      
      // Promise.raceを使用してキャンセルを先に処理
      if (cancelPromise) {
        await Promise.race([Promise.all(batchPromises), cancelPromise]);
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      // メモリ使用量をチェック
      if (memoryWatcher.isExceeded()) {
        throw new Error('Memory limit exceeded');
      }
    }

    return results;
  } finally {
    // メモリ監視を停止
    memoryWatcher.stop();
  }
}

/**
 * 配列を指定サイズのチャンクに分割する
 * @param array 分割対象の配列
 * @param size チャンクサイズ
 * @returns チャンクの配列
 */
function chunk<T>(array: T[], size: number): T[][] {
  return Array.from(
    { length: Math.ceil(array.length / size) },
    (_, index) => array.slice(index * size, (index + 1) * size)
  );
}

/**
 * デフォルトの翻訳関数
 * @param text 翻訳対象のテキスト
 * @returns 翻訳結果
 */
async function defaultTranslate(text: string): Promise<TranslationResult> {
  // 実際の翻訳APIを呼び出す実装に置き換える
  return {
    original: text,
    translated: `Translated: ${text}`,
  };
}

/**
 * メモリ使用量を監視する
 * @param limit メモリ制限（バイト）
 * @param onExceeded 制限超過時のコールバック
 * @returns メモリ監視オブジェクト
 */
function startMemoryWatcher(limit: number, onExceeded?: () => void) {
  let intervalId: NodeJS.Timeout | null = null;
  let exceeded = false;

  // メモリ使用量を定期的にチェック
  intervalId = setInterval(() => {
    const used = process.memoryUsage().heapUsed;
    if (used > limit && !exceeded) {
      exceeded = true;
      onExceeded?.();
    }
  }, 1000);

  return {
    isExceeded: () => exceeded,
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  };
} 