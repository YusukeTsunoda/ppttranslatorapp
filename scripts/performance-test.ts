/**
 * PPTXパーサーのパフォーマンステストスクリプト
 * CPU使用率、メモリ使用量、処理時間を計測し、ホットパスを特定します
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { StreamingPPTXParser } from '../lib/pptx/streaming-parser';
import { v4 as uuidv4 } from 'uuid';

// テスト設定
interface TestConfig {
  inputFile: string;
  iterations: number;
  batchSize: number;
  bufferSize: number;
  maxWorkers: number;
}

// パフォーマンス計測結果
interface PerformanceResult {
  testId: string;
  timestamp: string;
  config: TestConfig;
  metrics: {
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    memoryUsage: {
      beforeTest: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      afterTest: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      diff: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
    };
    phaseTimings: {
      [key: string]: {
        total: number;
        avg: number;
        percent: number;
      };
    };
  };
}

// パフォーマンス計測クラス
class PerformanceTester {
  private config: TestConfig;
  private results: PerformanceResult;
  private phaseStartTimes: Map<string, number> = new Map();
  private phaseTotalTimes: Map<string, number> = new Map();

  constructor(config: TestConfig) {
    this.config = config;
    this.results = {
      testId: uuidv4(),
      timestamp: new Date().toISOString(),
      config: { ...config },
      metrics: {
        totalTime: 0,
        avgTime: 0,
        minTime: Number.MAX_VALUE,
        maxTime: 0,
        memoryUsage: {
          beforeTest: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
          afterTest: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
          diff: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }
        },
        phaseTimings: {}
      }
    };
  }

  // パフォーマンステストを実行
  public async runTest(): Promise<PerformanceResult> {
    console.log(`パフォーマンステスト開始: ${this.config.inputFile}`);
    console.log(`設定: 繰り返し回数=${this.config.iterations}, バッチサイズ=${this.config.batchSize}, バッファサイズ=${this.config.bufferSize}, ワーカー数=${this.config.maxWorkers}`);

    // メモリ使用量の計測（テスト前）
    this.results.metrics.memoryUsage.beforeTest = this.getMemoryUsage();

    const times: number[] = [];
    let totalTime = 0;

    // 指定回数テストを繰り返す
    for (let i = 0; i < this.config.iterations; i++) {
      console.log(`イテレーション ${i + 1}/${this.config.iterations} 開始`);
      
      // GCを促す
      if (global.gc) {
        global.gc();
      }

      const startTime = performance.now();

      // パーサーの初期化
      const parser = new StreamingPPTXParser({
        batchSize: this.config.batchSize,
        bufferSize: this.config.bufferSize,
        maxWorkers: this.config.maxWorkers,
        parallelProcessing: true,
        streamingIO: true
      });

      // PPTXファイルの解析
      await parser.parsePPTX(this.config.inputFile);

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      times.push(duration);
      totalTime += duration;
      
      console.log(`イテレーション ${i + 1} 完了: ${duration.toFixed(2)}ms`);
    }

    // 結果の集計
    this.results.metrics.totalTime = totalTime;
    this.results.metrics.avgTime = totalTime / this.config.iterations;
    this.results.metrics.minTime = Math.min(...times);
    this.results.metrics.maxTime = Math.max(...times);

    // メモリ使用量の計測（テスト後）
    this.results.metrics.memoryUsage.afterTest = this.getMemoryUsage();
    
    // メモリ使用量の差分計算
    this.results.metrics.memoryUsage.diff = {
      rss: this.results.metrics.memoryUsage.afterTest.rss - this.results.metrics.memoryUsage.beforeTest.rss,
      heapTotal: this.results.metrics.memoryUsage.afterTest.heapTotal - this.results.metrics.memoryUsage.beforeTest.heapTotal,
      heapUsed: this.results.metrics.memoryUsage.afterTest.heapUsed - this.results.metrics.memoryUsage.beforeTest.heapUsed,
      external: this.results.metrics.memoryUsage.afterTest.external - this.results.metrics.memoryUsage.beforeTest.external
    };

    // フェーズごとのタイミング集計
    this.calculatePhaseTimings();

    // 結果の保存
    this.saveResults();

    return this.results;
  }

  // フェーズ開始時間を記録
  public startPhase(phaseName: string): void {
    this.phaseStartTimes.set(phaseName, performance.now());
  }

  // フェーズ終了時間を記録
  public endPhase(phaseName: string): void {
    const startTime = this.phaseStartTimes.get(phaseName);
    if (startTime) {
      const duration = performance.now() - startTime;
      const currentTotal = this.phaseTotalTimes.get(phaseName) || 0;
      this.phaseTotalTimes.set(phaseName, currentTotal + duration);
    }
  }

  // フェーズごとのタイミング集計
  private calculatePhaseTimings(): void {
    const totalTime = this.results.metrics.totalTime;
    
    for (const [phase, time] of this.phaseTotalTimes.entries()) {
      this.results.metrics.phaseTimings[phase] = {
        total: time,
        avg: time / this.config.iterations,
        percent: (time / totalTime) * 100
      };
    }
  }

  // メモリ使用量を取得
  private getMemoryUsage(): { rss: number; heapTotal: number; heapUsed: number; external: number } {
    const memUsage = process.memoryUsage();
    return {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024) // MB
    };
  }

  // 結果をJSONファイルとして保存
  private saveResults(): void {
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const fileName = `perf_test_${this.results.testId}_${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filePath = path.join(resultsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(this.results, null, 2));
    console.log(`パフォーマンステスト結果を保存しました: ${filePath}`);
  }
}

// メイン関数
async function main(): Promise<void> {
  // テスト設定
  const config: TestConfig = {
    inputFile: process.argv[2] || path.join(__dirname, '../test/samples/sample.pptx'),
    iterations: parseInt(process.argv[3] || '3', 10),
    batchSize: parseInt(process.argv[4] || '10', 10),
    bufferSize: parseInt(process.argv[5] || '1048576', 10), // 1MB
    maxWorkers: parseInt(process.argv[6] || '0', 10) // 0 = CPUコア数-1
  };

  // 入力ファイルの存在確認
  if (!fs.existsSync(config.inputFile)) {
    console.error(`エラー: 入力ファイル ${config.inputFile} が見つかりません`);
    process.exit(1);
  }

  // パフォーマンステスト実行
  const tester = new PerformanceTester(config);
  const results = await tester.runTest();

  // 結果の表示
  console.log('\n===== パフォーマンステスト結果 =====');
  console.log(`総処理時間: ${results.metrics.totalTime.toFixed(2)}ms`);
  console.log(`平均処理時間: ${results.metrics.avgTime.toFixed(2)}ms`);
  console.log(`最小処理時間: ${results.metrics.minTime.toFixed(2)}ms`);
  console.log(`最大処理時間: ${results.metrics.maxTime.toFixed(2)}ms`);
  
  console.log('\n----- メモリ使用量 (MB) -----');
  console.log(`テスト前: RSS=${results.metrics.memoryUsage.beforeTest.rss}, Heap使用=${results.metrics.memoryUsage.beforeTest.heapUsed}`);
  console.log(`テスト後: RSS=${results.metrics.memoryUsage.afterTest.rss}, Heap使用=${results.metrics.memoryUsage.afterTest.heapUsed}`);
  console.log(`差分: RSS=${results.metrics.memoryUsage.diff.rss}, Heap使用=${results.metrics.memoryUsage.diff.heapUsed}`);
  
  console.log('\n----- フェーズごとのタイミング -----');
  Object.entries(results.metrics.phaseTimings)
    .sort((a, b) => b[1].percent - a[1].percent)
    .forEach(([phase, timing]) => {
      console.log(`${phase}: ${timing.total.toFixed(2)}ms (${timing.percent.toFixed(2)}%)`);
    });
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('パフォーマンステスト実行エラー:', error);
    process.exit(1);
  });
}

export { PerformanceTester, TestConfig, PerformanceResult };
