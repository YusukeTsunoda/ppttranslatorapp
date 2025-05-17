import { performance } from 'perf_hooks';
import { TEST_UTILS } from '../config/test-config';

export interface MemoryUsage {
  heapTotal: number;
  heapUsed: number;
  external: number;
  rss: number;
}

export interface PerformanceResult {
  executionTime: number;
  memoryDelta: {
    heapTotal: number;
    heapUsed: number;
    external: number;
    rss: number;
  };
  cacheHitRate?: number;
  measurements: {
    times: number[];
    memory: MemoryUsage[];
  };
}

// メモリ使用量の測定
export const measureMemoryUsage = (): MemoryUsage => {
  const used = process.memoryUsage();
  return {
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
    rss: Math.round(used.rss / 1024 / 1024)
  };
};

// パフォーマンス測定用のラッパー関数
export const measurePerformance = async (
  fn: () => any,
  options: {
    iterations?: number;
    withCache?: boolean;
    warmup?: boolean;
  } = {}
): Promise<PerformanceResult> => {
  const {
    iterations = TEST_UTILS.ITERATIONS.STANDARD,
    withCache = false,
    warmup = true
  } = options;

  // ウォームアップ実行
  if (warmup) {
    for (let i = 0; i < TEST_UTILS.WARMUP_ITERATIONS; i++) {
      await fn();
    }
  }

  const startMemory = measureMemoryUsage();
  const measurements = {
    times: [] as number[],
    memory: [] as MemoryUsage[]
  };

  let cacheHits = 0;
  let totalCalls = 0;

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    measurements.times.push(endTime - startTime);

    if (i % TEST_UTILS.MEASUREMENT_INTERVAL === 0) {
      measurements.memory.push(measureMemoryUsage());
    }

    if (withCache && result?.cacheHit !== undefined) {
      totalCalls++;
      if (result.cacheHit) cacheHits++;
    }
  }

  const endMemory = measureMemoryUsage();

  return {
    executionTime: measurements.times.reduce((a, b) => a + b, 0) / iterations,
    memoryDelta: {
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      rss: endMemory.rss - startMemory.rss
    },
    cacheHitRate: withCache ? (cacheHits / totalCalls) * 100 : undefined,
    measurements
  };
};

// テストデータ生成用のユーティリティ
export const generateTestText = (length: number, language: 'en' | 'ja' | 'zh'): string => {
  switch (language) {
    case 'en':
      return 'Lorem ipsum '.repeat(Math.ceil(length / 12)).slice(0, length);
    case 'ja':
      return 'こんにちは'.repeat(Math.ceil(length / 5)).slice(0, length);
    case 'zh':
      return '你好世界'.repeat(Math.ceil(length / 4)).slice(0, length);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
};

// 統計情報の計算
export const calculateStatistics = (measurements: number[]) => {
  const sorted = [...measurements].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    mean: measurements.reduce((a, b) => a + b, 0) / measurements.length,
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}; 