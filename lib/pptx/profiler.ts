/**
 * PPTXパーサーのパフォーマンス測定用ユーティリティ
 */
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// メモリ使用量の単位変換（バイトからMB）
const bytesToMB = (bytes: number): number => bytes / 1024 / 1024;

// パフォーマンス測定結果の型定義
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number; // ミリ秒
  memoryBefore: {
    rss: number; // MB
    heapTotal: number; // MB
    heapUsed: number; // MB
    external: number; // MB
  };
  memoryAfter: {
    rss: number; // MB
    heapTotal: number; // MB
    heapUsed: number; // MB
    external: number; // MB
  };
  memoryDiff: {
    rss: number; // MB
    heapTotal: number; // MB
    heapUsed: number; // MB
    external: number; // MB
  };
  fileInfo?: {
    size: number; // バイト
    sizeInMB: number; // MB
  } | undefined;
  systemInfo: {
    platform: string;
    cpuCores: number;
    totalMemory: number; // MB
    freeMemory: number; // MB
  };
}

/**
 * パフォーマンス測定用のプロファイラークラス
 */
export class PPTXProfiler {
  private static instance: PPTXProfiler;
  private metricsLog: PerformanceMetrics[] = [];
  private logFilePath: string;

  private constructor() {
    // ログファイルのパスを設定
    const logDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    this.logFilePath = path.join(logDir, `pptx-performance-${new Date().toISOString().replace(/:/g, '-')}.json`);
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): PPTXProfiler {
    if (!PPTXProfiler.instance) {
      PPTXProfiler.instance = new PPTXProfiler();
    }
    return PPTXProfiler.instance;
  }

  /**
   * パフォーマンス測定を開始
   * @param operationName 測定する操作の名前
   * @param filePath 処理するファイルのパス（オプション）
   * @returns 測定ID
   */
  public startMeasurement(operationName: string, filePath?: string): string {
    // 一意の測定IDを生成
    const measurementId = `${operationName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 現在のメモリ使用量を取得
    const memoryBefore = process.memoryUsage();
    
    // ファイル情報を取得（指定されている場合）
    let fileInfo = undefined;
    if (filePath && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      fileInfo = {
        size: stats.size,
        sizeInMB: bytesToMB(stats.size)
      };
    }
    
    // システム情報を取得
    const systemInfo = {
      platform: process.platform,
      cpuCores: os.cpus().length,
      totalMemory: bytesToMB(os.totalmem()),
      freeMemory: bytesToMB(os.freemem())
    };
    
    // 測定データを記録
    this.metricsLog.push({
      operationName,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      memoryBefore: {
        rss: bytesToMB(memoryBefore.rss),
        heapTotal: bytesToMB(memoryBefore.heapTotal),
        heapUsed: bytesToMB(memoryBefore.heapUsed),
        external: bytesToMB(memoryBefore.external)
      },
      memoryAfter: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0
      },
      memoryDiff: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0
      },
      fileInfo,
      systemInfo
    });
    
    return measurementId;
  }

  /**
   * パフォーマンス測定を終了
   * @param measurementId 測定ID
   * @returns 測定結果
   */
  public endMeasurement(measurementId: string): PerformanceMetrics | null {
    // 測定IDから対象の測定データを検索
    const index = this.metricsLog.findIndex(
      (metric) => `${metric.operationName}-${metric.startTime}-` === measurementId.substring(0, measurementId.lastIndexOf('-') + 1)
    );
    
    if (index === -1) {
      console.error(`測定ID ${measurementId} が見つかりません`);
      return null;
    }
    
    // 現在のメモリ使用量を取得
    const memoryAfter = process.memoryUsage();
    const endTime = performance.now();
    
    // 測定データを更新
    const metric = this.metricsLog[index];
    if (!metric) {
      console.error(`測定データが見つかりません: ${measurementId}`);
      return null;
    }
    
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    
    metric.memoryAfter = {
      rss: bytesToMB(memoryAfter.rss),
      heapTotal: bytesToMB(memoryAfter.heapTotal),
      heapUsed: bytesToMB(memoryAfter.heapUsed),
      external: bytesToMB(memoryAfter.external)
    };
    
    // メモリ使用量の差分を計算
    metric.memoryDiff = {
      rss: metric.memoryAfter.rss - metric.memoryBefore.rss,
      heapTotal: metric.memoryAfter.heapTotal - metric.memoryBefore.heapTotal,
      heapUsed: metric.memoryAfter.heapUsed - metric.memoryBefore.heapUsed,
      external: metric.memoryAfter.external - metric.memoryBefore.external
    };
    
    // 測定結果をログファイルに保存
    this.saveMetricsToFile();
    
    // 測定結果をコンソールに出力
    this.logMetricToConsole(metric);
    
    return metric;
  }

  /**
   * すべての測定結果を取得
   */
  public getAllMetrics(): PerformanceMetrics[] {
    return [...this.metricsLog];
  }

  /**
   * 測定結果をログファイルに保存
   */
  private saveMetricsToFile(): void {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.metricsLog, null, 2));
    } catch (error) {
      console.error('パフォーマンスメトリクスの保存に失敗しました:', error);
    }
  }

  /**
   * 測定結果をコンソールに出力
   */
  private logMetricToConsole(metric: PerformanceMetrics): void {
    if (!metric) {
      console.error('メトリクスが未定義です');
      return;
    }
    
    console.log(`\n===== パフォーマンス測定結果: ${metric.operationName} =====`);
    console.log(`実行時間: ${metric.duration.toFixed(2)}ms (${(metric.duration / 1000).toFixed(2)}秒)`);
    
    if (metric.fileInfo) {
      console.log(`ファイルサイズ: ${metric.fileInfo.sizeInMB.toFixed(2)}MB`);
    }
    
    console.log('メモリ使用量:');
    console.log(`  前: RSS=${metric.memoryBefore.rss.toFixed(2)}MB, Heap=${metric.memoryBefore.heapUsed.toFixed(2)}MB`);
    console.log(`  後: RSS=${metric.memoryAfter.rss.toFixed(2)}MB, Heap=${metric.memoryAfter.heapUsed.toFixed(2)}MB`);
    console.log(`  差分: RSS=${metric.memoryDiff.rss.toFixed(2)}MB, Heap=${metric.memoryDiff.heapUsed.toFixed(2)}MB`);
    
    console.log(`システム情報: ${metric.systemInfo.platform}, CPUコア数=${metric.systemInfo.cpuCores}`);
    console.log(`システムメモリ: 合計=${metric.systemInfo.totalMemory.toFixed(2)}MB, 空き=${metric.systemInfo.freeMemory.toFixed(2)}MB`);
    console.log('===========================================\n');
  }
}

/**
 * 関数実行のパフォーマンスを測定するデコレータ
 * メソッドデコレータの代わりにメソッドラッパーとして実装
 */
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(methodName: string) {
  return function(method: T): T {
    const wrappedMethod = async function(this: any, ...args: any[]): Promise<any> {
      const profiler = PPTXProfiler.getInstance();
      const filePath = args[0] && typeof args[0] === 'string' ? args[0] : undefined;
      const measurementId = profiler.startMeasurement(`${methodName}`, filePath);
      
      try {
        return await method.apply(this, args);
      } finally {
        profiler.endMeasurement(measurementId);
      }
    };
    return wrappedMethod as T;
  };
}
