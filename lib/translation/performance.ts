import { TranslationCache } from './cache';
import { translateConcurrently } from './concurrent';

interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: {
    user: number;
    system: number;
    percentage: number;
  };
  batchCount?: number;
  averageTimePerBatch?: number;
  parallelExecutions?: number;
  averageTimePerExecution?: number;
  cacheHit?: boolean;
  detailed?: {
    preprocessing: number;
    translation: number;
    postprocessing: number;
  };
  timeSeries?: Array<{
    timestamp: number;
    metrics: {
      memoryUsage: number;
      cpuUsage: number;
    };
  }>;
}

interface PerformanceOptions {
  enableBatching?: boolean;
  batchSize?: number;
  useCache?: boolean;
  enableParallel?: boolean;
  maxConcurrency?: number;
  memoryLimit?: number;
  cpuLimit?: number;
  performanceThreshold?: number;
  onWarning?: (message: string) => void;
  collectDetailedMetrics?: boolean;
  collectTimeSeriesData?: boolean;
}

interface TranslationResult {
  result: string;
  metrics: PerformanceMetrics;
}

// キャッシュインスタンスを作成
const cache = new TranslationCache({
  maxSize: 1000,
  ttl: 3600, // 1時間
});

/**
 * パフォーマンス計測付きの翻訳処理
 * @param text 翻訳対象のテキスト
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @param options パフォーマンスオプション
 * @returns 翻訳結果とメトリクス
 */
export async function translateWithPerformance(
  text: string,
  sourceLang: string,
  targetLang: string,
  options: PerformanceOptions = {}
): Promise<TranslationResult> {
  const startTime = process.hrtime();
  const startCpu = process.cpuUsage();
  const metrics: PerformanceMetrics = {
    executionTime: 0,
    memoryUsage: {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
    },
    cpuUsage: {
      user: 0,
      system: 0,
      percentage: 0,
    },
  };

  // 時系列データの収集を開始
  const timeSeriesData: PerformanceMetrics['timeSeries'] = options.collectTimeSeriesData ? [] : undefined;
  let timeSeriesInterval: NodeJS.Timeout | null = null;

  if (timeSeriesData) {
    timeSeriesInterval = setInterval(() => {
      const memory = process.memoryUsage();
      const cpu = process.cpuUsage();
      timeSeriesData.push({
        timestamp: Date.now(),
        metrics: {
          memoryUsage: memory.heapUsed,
          cpuUsage: (cpu.user + cpu.system) / 1000000,
        },
      });
    }, 100);
  }

  try {
    // メモリ使用量をチェック
    const memory = process.memoryUsage();
    if (options.memoryLimit && memory.heapUsed > options.memoryLimit) {
      throw new Error('Memory limit exceeded');
    }

    let result: string;
    const detailedMetrics: PerformanceMetrics['detailed'] = options.collectDetailedMetrics ? {
      preprocessing: 0,
      translation: 0,
      postprocessing: 0,
    } : undefined;

    // 前処理の時間を計測
    const preprocessStart = process.hrtime();
    const texts = text.split('\\n').filter(Boolean);
    if (detailedMetrics) {
      const [preprocessSecs, preprocessNanos] = process.hrtime(preprocessStart);
      detailedMetrics.preprocessing = preprocessSecs * 1000 + preprocessNanos / 1000000;
    }

    // キャッシュチェック
    if (options.useCache) {
      const cacheKey = { text, sourceLang, targetLang };
      const cached = cache.get(cacheKey);
      if (cached) {
        metrics.cacheHit = true;
        result = cached.translated;
      }
    }

    if (!metrics.cacheHit) {
      // 翻訳処理の時間を計測
      const translationStart = process.hrtime();

      if (options.enableParallel) {
        // 並列処理
        const results = await translateConcurrently(texts, sourceLang, targetLang, {
          concurrency: options.maxConcurrency,
          batchSize: options.batchSize,
        });
        result = results.map(r => r.translated).join('\\n');
        metrics.parallelExecutions = texts.length;
        metrics.averageTimePerExecution = detailedMetrics?.translation! / texts.length;
      } else if (options.enableBatching) {
        // バッチ処理
        const batchSize = options.batchSize || 10;
        const batches = chunk(texts, batchSize);
        const results = await Promise.all(
          batches.map(batch => translateBatch(batch, sourceLang, targetLang))
        );
        result = results.flat().join('\\n');
        metrics.batchCount = batches.length;
        metrics.averageTimePerBatch = detailedMetrics?.translation! / batches.length;
      } else {
        // 単一処理
        result = await translateSingle(text, sourceLang, targetLang);
      }

      if (detailedMetrics) {
        const [translationSecs, translationNanos] = process.hrtime(translationStart);
        detailedMetrics.translation = translationSecs * 1000 + translationNanos / 1000000;
      }

      // キャッシュに保存
      if (options.useCache) {
        cache.set({ text, sourceLang, targetLang }, {
          translated: result,
          timestamp: Date.now(),
        });
      }
    }

    // 後処理の時間を計測
    const postprocessStart = process.hrtime();
    // 後処理のロジックをここに追加
    if (detailedMetrics) {
      const [postprocessSecs, postprocessNanos] = process.hrtime(postprocessStart);
      detailedMetrics.postprocessing = postprocessSecs * 1000 + postprocessNanos / 1000000;
    }

    // 最終的なメトリクスを計算
    const [secs, nanos] = process.hrtime(startTime);
    const cpuUsage = process.cpuUsage(startCpu);
    const memoryUsage = process.memoryUsage();

    metrics.executionTime = secs * 1000 + nanos / 1000000;
    metrics.cpuUsage = {
      user: cpuUsage.user / 1000000,
      system: cpuUsage.system / 1000000,
      percentage: ((cpuUsage.user + cpuUsage.system) / 1000000) / metrics.executionTime * 100,
    };
    metrics.memoryUsage = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    };

    if (detailedMetrics) {
      metrics.detailed = detailedMetrics;
    }
    if (timeSeriesData) {
      metrics.timeSeries = timeSeriesData;
    }

    // パフォーマンス警告
    if (options.performanceThreshold && metrics.executionTime > options.performanceThreshold) {
      options.onWarning?.(`Performance threshold exceeded: ${metrics.executionTime}ms`);
    }
    if (options.cpuLimit && metrics.cpuUsage.percentage > options.cpuLimit) {
      options.onWarning?.(`CPU usage exceeded limit: ${metrics.cpuUsage.percentage}%`);
    }

    return { result, metrics };
  } finally {
    if (timeSeriesInterval) {
      clearInterval(timeSeriesInterval);
    }
  }
}

/**
 * テキストの配列をバッチに分割
 * @param array 配列
 * @param size バッチサイズ
 * @returns バッチの配列
 */
function chunk<T>(array: T[], size: number): T[][] {
  return Array.from(
    { length: Math.ceil(array.length / size) },
    (_, index) => array.slice(index * size, (index + 1) * size)
  );
}

/**
 * バッチ単位で翻訳を実行
 * @param texts テキストの配列
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @returns 翻訳結果の配列
 */
async function translateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<string[]> {
  // 実際の翻訳APIを呼び出す実装に置き換える
  return texts.map(text => `Translated: ${text}`);
}

/**
 * 単一のテキストを翻訳
 * @param text テキスト
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @returns 翻訳結果
 */
async function translateSingle(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // 実際の翻訳APIを呼び出す実装に置き換える
  return `Translated: ${text}`;
} 