import fs from 'fs';
import path from 'path';
import { PerformanceResult } from './measurement';

interface TestReport {
  timestamp: string;
  testName: string;
  results: {
    executionTime: number;
    memoryUsage: {
      heapTotal: number;
      heapUsed: number;
      external: number;
      rss: number;
    };
    statistics: {
      min: number;
      max: number;
      median: number;
      mean: number;
      p95: number;
      p99: number;
    };
    cacheHitRate?: number;
    memoryTrend?: Array<{
      timestamp: number;
      heapUsed: number;
    }>;
  };
  metadata: {
    nodeVersion: string;
    platform: string;
    arch: string;
    totalMemory: number;
  };
}

export class ReportGenerator {
  private readonly reportsDir: string;
  private readonly currentDate: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports', 'performance');
    this.currentDate = new Date().toISOString().split('T')[0];
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    const dateDir = path.join(this.reportsDir, this.currentDate);
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }
  }

  public generateReport(
    testName: string,
    result: PerformanceResult,
    additionalData: Record<string, any> = {}
  ): void {
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      testName,
      results: {
        executionTime: result.executionTime,
        memoryUsage: result.memoryDelta,
        statistics: this.calculateStatistics(result.measurements.times),
        cacheHitRate: result.cacheHitRate,
        memoryTrend: result.measurements.memory.map((usage, index) => ({
          timestamp: index * 100, // 100ms間隔
          heapUsed: usage.heapUsed
        }))
      },
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024)) // MB単位
      },
      ...additionalData
    };

    this.saveReport(report);
    this.generateSummary(report);
  }

  private calculateStatistics(measurements: number[]): TestReport['results']['statistics'] {
    const sorted = [...measurements].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      mean: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  private saveReport(report: TestReport): void {
    const fileName = `${report.testName}-${Date.now()}.json`;
    const filePath = path.join(this.reportsDir, this.currentDate, fileName);
    
    fs.writeFileSync(
      filePath,
      JSON.stringify(report, null, 2),
      'utf8'
    );

    console.log(`レポートを保存しました: ${filePath}`);
  }

  private generateSummary(report: TestReport): void {
    const summaryPath = path.join(this.reportsDir, this.currentDate, 'summary.md');
    
    const summary = `
# パフォーマンステスト実行サマリー

## ${report.testName}
実行日時: ${report.timestamp}

### 実行結果
- 平均実行時間: ${report.results.executionTime.toFixed(2)}ms
- メモリ使用量: ${report.results.memoryUsage.heapUsed}MB
${report.results.cacheHitRate ? `- キャッシュヒット率: ${report.results.cacheHitRate.toFixed(2)}%` : ''}

### 統計情報
- 最小値: ${report.results.statistics.min.toFixed(2)}ms
- 最大値: ${report.results.statistics.max.toFixed(2)}ms
- 中央値: ${report.results.statistics.median.toFixed(2)}ms
- 95パーセンタイル: ${report.results.statistics.p95.toFixed(2)}ms
- 99パーセンタイル: ${report.results.statistics.p99.toFixed(2)}ms

### 環境情報
- Node.jsバージョン: ${report.metadata.nodeVersion}
- プラットフォーム: ${report.metadata.platform}
- アーキテクチャ: ${report.metadata.arch}
- 総メモリ: ${report.metadata.totalMemory}MB

---
`;

    fs.appendFileSync(summaryPath, summary);
    console.log(`サマリーを更新しました: ${summaryPath}`);
  }
} 