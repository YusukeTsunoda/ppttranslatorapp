/**
 * フラッキーテスト検出ユーティリティ
 * 不安定なテストを特定し、レポートを生成するためのユーティリティ
 */

import fs from 'fs/promises';
import path from 'path';
import { detectFlaky } from './test-helpers';

// フラッキーテスト情報
export interface FlakyTestInfo {
  name: string;
  file: string;
  failureRate: number;
  averageDuration: number;
  lastRun: Date;
  results: Array<{
    success: boolean;
    errorMessage?: string;
    duration: number;
  }>;
}

/**
 * フラッキーテスト検出クラス
 */
export class FlakyTestDetector {
  private static instance: FlakyTestDetector;
  private flakyTests: Map<string, FlakyTestInfo>;
  private reportDirectory: string;

  private constructor() {
    this.flakyTests = new Map<string, FlakyTestInfo>();
    this.reportDirectory = path.join(process.cwd(), 'reports', 'flaky-tests');
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): FlakyTestDetector {
    if (!FlakyTestDetector.instance) {
      FlakyTestDetector.instance = new FlakyTestDetector();
    }
    return FlakyTestDetector.instance;
  }

  /**
   * 初期化
   */
  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.reportDirectory, { recursive: true });
      
      // 既存のレポートがあれば読み込む
      const reportFile = path.join(this.reportDirectory, 'flaky-tests.json');
      try {
        const data = await fs.readFile(reportFile, 'utf-8');
        const report = JSON.parse(data);
        
        if (Array.isArray(report)) {
          report.forEach((test) => {
            this.flakyTests.set(`${test.file}:${test.name}`, {
              ...test,
              lastRun: new Date(test.lastRun),
            });
          });
        }
      } catch (error) {
        // ファイルが存在しない場合は無視
      }
    } catch (error) {
      console.error('フラッキーテスト検出器の初期化中にエラーが発生しました:', error);
    }
  }

  /**
   * テストを実行して不安定性を検出
   */
  public async detectFlaky(
    testName: string,
    testFile: string,
    testFn: () => Promise<void>,
    options: {
      iterations?: number;
      failureThreshold?: number;
      logResults?: boolean;
    } = {}
  ): Promise<FlakyTestInfo> {
    const testKey = `${testFile}:${testName}`;
    const result = await detectFlaky(testFn, options);
    
    const testInfo: FlakyTestInfo = {
      name: testName,
      file: testFile,
      failureRate: result.failureRate,
      averageDuration: result.averageDuration,
      lastRun: new Date(),
      results: result.results.map((r) => ({
        success: r.success,
        errorMessage: r.error?.message,
        duration: r.duration,
      })),
    };
    
    // フラッキーテストの場合はレジストリに登録
    if (result.isFlaky) {
      this.flakyTests.set(testKey, testInfo);
      await this.saveReport();
    }
    
    return testInfo;
  }

  /**
   * フラッキーテストのレポートを保存
   */
  private async saveReport(): Promise<void> {
    try {
      const reportFile = path.join(this.reportDirectory, 'flaky-tests.json');
      const report = Array.from(this.flakyTests.values());
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf-8');
      
      // HTMLレポートも生成
      await this.generateHtmlReport();
    } catch (error) {
      console.error('フラッキーテストレポートの保存中にエラーが発生しました:', error);
    }
  }

  /**
   * HTMLレポートを生成
   */
  private async generateHtmlReport(): Promise<void> {
    try {
      const reportFile = path.join(this.reportDirectory, 'flaky-tests.html');
      const report = Array.from(this.flakyTests.values());
      
      // HTMLレポートを生成
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>フラッキーテストレポート</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            h1 { color: #333; }
            .summary { margin-bottom: 20px; }
            .test-list { width: 100%; border-collapse: collapse; }
            .test-list th, .test-list td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .test-list th { background-color: #f2f2f2; }
            .high { color: red; }
            .medium { color: orange; }
            .low { color: green; }
            .details { margin-top: 10px; }
            .details-title { cursor: pointer; color: #0066cc; }
            .details-content { display: none; margin-left: 20px; }
            .success { color: green; }
            .failure { color: red; }
          </style>
        </head>
        <body>
          <h1>フラッキーテストレポート</h1>
          <div class="summary">
            <p>検出されたフラッキーテスト: ${report.length}件</p>
            <p>最終更新: ${new Date().toLocaleString()}</p>
          </div>
          <table class="test-list">
            <thead>
              <tr>
                <th>テスト名</th>
                <th>ファイル</th>
                <th>失敗率</th>
                <th>平均実行時間</th>
                <th>最終実行</th>
              </tr>
            </thead>
            <tbody>
              ${report.map((test) => `
                <tr>
                  <td>${test.name}</td>
                  <td>${test.file}</td>
                  <td class="${test.failureRate > 0.5 ? 'high' : test.failureRate > 0.2 ? 'medium' : 'low'}">${(test.failureRate * 100).toFixed(1)}%</td>
                  <td>${test.averageDuration.toFixed(2)}ms</td>
                  <td>${new Date(test.lastRun).toLocaleString()}</td>
                </tr>
                <tr>
                  <td colspan="5">
                    <div class="details">
                      <div class="details-title" onclick="toggleDetails('${test.name.replace(/[^a-zA-Z0-9]/g, '_')}')">詳細を表示</div>
                      <div id="${test.name.replace(/[^a-zA-Z0-9]/g, '_')}" class="details-content">
                        <ul>
                          ${test.results.map((result, index) => `
                            <li class="${result.success ? 'success' : 'failure'}">
                              実行 ${index + 1}: ${result.success ? '成功' : '失敗'} (${result.duration.toFixed(2)}ms)
                              ${result.errorMessage ? `<br>エラー: ${result.errorMessage}` : ''}
                            </li>
                          `).join('')}
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            function toggleDetails(id) {
              const element = document.getElementById(id);
              if (element.style.display === 'block') {
                element.style.display = 'none';
              } else {
                element.style.display = 'block';
              }
            }
          </script>
        </body>
        </html>
      `;
      
      await fs.writeFile(reportFile, html, 'utf-8');
    } catch (error) {
      console.error('HTMLレポートの生成中にエラーが発生しました:', error);
    }
  }

  /**
   * フラッキーテストの一覧を取得
   */
  public getFlakyTests(): FlakyTestInfo[] {
    return Array.from(this.flakyTests.values());
  }

  /**
   * フラッキーテストの統計情報を取得
   */
  public getStatistics(): {
    totalCount: number;
    highFailureRate: number;
    mediumFailureRate: number;
    lowFailureRate: number;
    averageFailureRate: number;
    averageDuration: number;
  } {
    const tests = this.getFlakyTests();
    const stats = {
      totalCount: tests.length,
      highFailureRate: 0,
      mediumFailureRate: 0,
      lowFailureRate: 0,
      averageFailureRate: 0,
      averageDuration: 0,
    };
    
    if (tests.length === 0) {
      return stats;
    }
    
    let totalFailureRate = 0;
    let totalDuration = 0;
    
    tests.forEach((test) => {
      totalFailureRate += test.failureRate;
      totalDuration += test.averageDuration;
      
      if (test.failureRate > 0.5) {
        stats.highFailureRate++;
      } else if (test.failureRate > 0.2) {
        stats.mediumFailureRate++;
      } else {
        stats.lowFailureRate++;
      }
    });
    
    stats.averageFailureRate = totalFailureRate / tests.length;
    stats.averageDuration = totalDuration / tests.length;
    
    return stats;
  }
}

// シングルトンインスタンスをエクスポート
export const flakyTestDetector = FlakyTestDetector.getInstance();
