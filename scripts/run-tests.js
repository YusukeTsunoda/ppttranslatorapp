#!/usr/bin/env node

/**
 * テスト実行スクリプト
 * テストの実行、レポート生成、フラッキーテストの検出などを行います
 */

const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { performance } = require('perf_hooks');

// 設定
const config = {
  // テストの種類
  testTypes: {
    unit: {
      dir: 'tests/unit',
      command: 'jest',
      args: ['tests/unit', '--config', 'jest.config.js'],
      retries: 1,
    },
    integration: {
      dir: 'tests/integration',
      command: 'jest',
      args: ['tests/integration', '--config', 'jest.config.js'],
      retries: 2,
    },
    api: {
      dir: 'tests/api',
      command: 'jest',
      args: ['tests/api', '--config', 'jest.config.js'],
      retries: 1,
    },
    performance: {
      dir: 'tests/performance',
      command: 'jest',
      args: ['tests/performance', '--config', 'jest.config.js', '--runInBand'],
      retries: 0,
    },
  },
  // レポート出力ディレクトリ
  reportDir: 'test-reports',
  // フラッキーテスト検出の閾値（失敗率）
  flakyTestThreshold: 0.3,
};

// コマンドライン引数の解析
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  detectFlaky: args.includes('--detect-flaky'),
  generateReport: args.includes('--report') || args.includes('-r'),
  ci: args.includes('--ci'),
};

/**
 * メイン関数
 */
async function main() {
  console.log('=== テスト実行スクリプト ===');
  
  try {
    // レポートディレクトリの作成
    if (options.generateReport) {
      await fs.mkdir(config.reportDir, { recursive: true });
    }
    
    // テスト実行
    if (testType === 'all') {
      // 全てのテストを実行
      const results = {};
      for (const [type, settings] of Object.entries(config.testTypes)) {
        console.log(`\n=== ${type}テストの実行 ===`);
        results[type] = await runTest(type, settings);
      }
      
      // 結果の集計
      const summary = summarizeResults(results);
      
      // レポート生成
      if (options.generateReport) {
        await generateReport(results, summary);
      }
      
      // 結果の表示
      displaySummary(summary);
      
      // 終了コードの設定
      process.exitCode = summary.failed > 0 ? 1 : 0;
    } else if (config.testTypes[testType]) {
      // 特定のテストタイプを実行
      console.log(`\n=== ${testType}テストの実行 ===`);
      const result = await runTest(testType, config.testTypes[testType]);
      
      // レポート生成
      if (options.generateReport) {
        await generateReport({ [testType]: result }, { 
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          skipped: result.skipped,
          duration: result.duration,
        });
      }
      
      // 結果の表示
      displayTestResult(testType, result);
      
      // 終了コードの設定
      process.exitCode = result.failed > 0 ? 1 : 0;
    } else {
      console.error(`エラー: 不明なテストタイプ '${testType}'`);
      console.log('利用可能なテストタイプ: unit, integration, api, performance, all');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
    process.exitCode = 1;
  }
}

/**
 * テストを実行する
 */
async function runTest(type, settings) {
  const startTime = performance.now();
  
  // テストディレクトリの存在確認
  try {
    await fs.access(settings.dir);
  } catch (error) {
    console.warn(`警告: ${settings.dir} ディレクトリが見つかりません。スキップします。`);
    return {
      type,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      flakyTests: [],
    };
  }
  
  // テスト実行オプションの設定
  const args = [...settings.args];
  
  if (options.verbose) {
    args.push('--verbose');
  }
  
  if (options.ci) {
    args.push('--ci');
    args.push('--silent');
  }
  
  if (options.generateReport) {
    args.push('--json');
    args.push(`--outputFile=${path.join(config.reportDir, `${type}-results.json`)}`);
  }
  
  // フラッキーテスト検出
  let flakyTests = [];
  if (options.detectFlaky && settings.retries > 0) {
    console.log(`フラッキーテスト検出モード: 各テストを${settings.retries + 1}回実行します`);
    flakyTests = await detectFlakyTests(type, settings);
  }
  
  // テスト実行
  console.log(`${settings.command} ${args.join(' ')} を実行中...`);
  
  const result = await new Promise((resolve) => {
    const testProcess = spawn(settings.command, args, {
      stdio: 'inherit',
      shell: true,
    });
    
    testProcess.on('close', (code) => {
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // 秒単位
      
      resolve({
        type,
        exitCode: code,
        duration,
        flakyTests,
      });
    });
  });
  
  // テスト結果の解析
  let testStats = { total: 0, passed: 0, failed: 0, skipped: 0 };
  
  if (options.generateReport) {
    try {
      const resultFilePath = path.join(config.reportDir, `${type}-results.json`);
      const resultData = await fs.readFile(resultFilePath, 'utf8');
      const jestResult = JSON.parse(resultData);
      
      testStats = {
        total: jestResult.numTotalTests,
        passed: jestResult.numPassedTests,
        failed: jestResult.numFailedTests,
        skipped: jestResult.numPendingTests,
      };
    } catch (error) {
      console.error(`テスト結果の解析中にエラーが発生しました: ${error.message}`);
    }
  } else {
    // 結果ファイルがない場合は終了コードから推測
    testStats = {
      total: 0,
      passed: result.exitCode === 0 ? 1 : 0,
      failed: result.exitCode !== 0 ? 1 : 0,
      skipped: 0,
    };
  }
  
  return {
    ...testStats,
    duration: result.duration,
    flakyTests: result.flakyTests,
  };
}

/**
 * フラッキーテストを検出する
 */
async function detectFlakyTests(type, settings) {
  console.log(`${type}テストのフラッキーテスト検出を開始...`);
  
  // テストファイルの一覧を取得
  const testFiles = await findTestFiles(settings.dir);
  
  if (testFiles.length === 0) {
    console.log('テストファイルが見つかりませんでした');
    return [];
  }
  
  console.log(`${testFiles.length}個のテストファイルを検出しました`);
  
  const flakyTests = [];
  
  // 各テストファイルを複数回実行
  for (const testFile of testFiles) {
    const relativePath = path.relative(process.cwd(), testFile);
    console.log(`テスト実行: ${relativePath}`);
    
    const results = [];
    const totalRuns = settings.retries + 1;
    
    for (let i = 0; i < totalRuns; i++) {
      console.log(`  実行 ${i + 1}/${totalRuns}...`);
      
      const result = await new Promise((resolve) => {
        const args = [...settings.args, relativePath, '--silent'];
        
        const testProcess = spawn(settings.command, args, {
          stdio: 'pipe',
          shell: true,
        });
        
        let output = '';
        
        testProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        testProcess.stderr.on('data', (data) => {
          output += data.toString();
        });
        
        testProcess.on('close', (code) => {
          resolve({
            exitCode: code,
            output,
          });
        });
      });
      
      results.push(result.exitCode === 0);
    }
    
    // 失敗率の計算
    const failureRate = results.filter((passed) => !passed).length / totalRuns;
    
    // 閾値以上の失敗率の場合はフラッキーテストとして記録
    if (failureRate > 0 && failureRate <= config.flakyTestThreshold) {
      flakyTests.push({
        file: relativePath,
        failureRate,
        runs: totalRuns,
        failures: results.filter((passed) => !passed).length,
      });
    }
  }
  
  return flakyTests;
}

/**
 * テストファイルを検索する
 */
async function findTestFiles(dir) {
  const files = [];
  
  async function scanDir(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.test.js') || 
         entry.name.endsWith('.test.ts') || 
         entry.name.endsWith('.spec.js') || 
         entry.name.endsWith('.spec.ts'))
      ) {
        files.push(fullPath);
      }
    }
  }
  
  await scanDir(dir);
  return files;
}

/**
 * テスト結果をまとめる
 */
function summarizeResults(results) {
  const summary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    flakyTests: [],
  };
  
  for (const result of Object.values(results)) {
    summary.total += result.total;
    summary.passed += result.passed;
    summary.failed += result.failed;
    summary.skipped += result.skipped;
    summary.duration += result.duration;
    
    if (result.flakyTests && result.flakyTests.length > 0) {
      summary.flakyTests.push(...result.flakyTests);
    }
  }
  
  return summary;
}

/**
 * テスト結果を表示する
 */
function displayTestResult(type, result) {
  console.log(`\n=== ${type}テスト結果 ===`);
  console.log(`合計: ${result.total}`);
  console.log(`成功: ${result.passed}`);
  console.log(`失敗: ${result.failed}`);
  console.log(`スキップ: ${result.skipped}`);
  console.log(`所要時間: ${result.duration.toFixed(2)}秒`);
  
  if (result.flakyTests && result.flakyTests.length > 0) {
    console.log(`\nフラッキーテスト: ${result.flakyTests.length}個`);
    
    for (const test of result.flakyTests) {
      console.log(`  ${test.file} - 失敗率: ${(test.failureRate * 100).toFixed(1)}% (${test.failures}/${test.runs})`);
    }
  }
}

/**
 * テスト結果のサマリーを表示する
 */
function displaySummary(summary) {
  console.log('\n=== テスト結果サマリー ===');
  console.log(`合計: ${summary.total}`);
  console.log(`成功: ${summary.passed}`);
  console.log(`失敗: ${summary.failed}`);
  console.log(`スキップ: ${summary.skipped}`);
  console.log(`所要時間: ${summary.duration.toFixed(2)}秒`);
  
  if (summary.flakyTests && summary.flakyTests.length > 0) {
    console.log(`\nフラッキーテスト: ${summary.flakyTests.length}個`);
    
    for (const test of summary.flakyTests) {
      console.log(`  ${test.file} - 失敗率: ${(test.failureRate * 100).toFixed(1)}% (${test.failures}/${test.runs})`);
    }
  }
  
  console.log('\n=== 結果 ===');
  if (summary.failed > 0) {
    console.log('❌ テストが失敗しました');
  } else {
    console.log('✅ 全てのテストが成功しました');
  }
}

/**
 * テスト結果のレポートを生成する
 */
async function generateReport(results, summary) {
  const reportPath = path.join(config.reportDir, 'summary.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    results,
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`レポートを生成しました: ${reportPath}`);
  
  // HTMLレポートの生成
  const htmlReportPath = path.join(config.reportDir, 'report.html');
  
  const htmlReport = generateHtmlReport(report);
  await fs.writeFile(htmlReportPath, htmlReport);
  console.log(`HTMLレポートを生成しました: ${htmlReportPath}`);
}

/**
 * HTMLレポートを生成する
 */
function generateHtmlReport(report) {
  const { summary, results, timestamp } = report;
  
  // 成功率の計算
  const successRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : 0;
  
  // 結果テーブルの生成
  let resultRows = '';
  for (const [type, result] of Object.entries(results)) {
    const typeSuccessRate = result.total > 0 ? (result.passed / result.total * 100).toFixed(1) : 0;
    
    resultRows += `
      <tr>
        <td>${type}</td>
        <td>${result.total}</td>
        <td>${result.passed}</td>
        <td>${result.failed}</td>
        <td>${result.skipped}</td>
        <td>${result.duration.toFixed(2)}秒</td>
        <td>${typeSuccessRate}%</td>
      </tr>
    `;
  }
  
  // フラッキーテストテーブルの生成
  let flakyTestRows = '';
  if (summary.flakyTests && summary.flakyTests.length > 0) {
    for (const test of summary.flakyTests) {
      flakyTestRows += `
        <tr>
          <td>${test.file}</td>
          <td>${(test.failureRate * 100).toFixed(1)}%</td>
          <td>${test.failures}/${test.runs}</td>
        </tr>
      `;
    }
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>テスト結果レポート</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3 {
          color: #2c3e50;
        }
        .summary {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          flex: 1;
          min-width: 200px;
        }
        .summary-card h3 {
          margin-top: 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        .success-rate {
          font-size: 2em;
          font-weight: bold;
          color: ${successRate >= 90 ? '#28a745' : successRate >= 70 ? '#ffc107' : '#dc3545'};
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .status {
          font-weight: bold;
          padding: 15px;
          border-radius: 8px;
          display: inline-block;
          margin-top: 20px;
        }
        .status.pass {
          background-color: #d4edda;
          color: #155724;
        }
        .status.fail {
          background-color: #f8d7da;
          color: #721c24;
        }
        .timestamp {
          color: #6c757d;
          font-style: italic;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <h1>テスト結果レポート</h1>
      
      <div class="summary">
        <div class="summary-card">
          <h3>成功率</h3>
          <div class="success-rate">${successRate}%</div>
        </div>
        <div class="summary-card">
          <h3>テスト数</h3>
          <p>合計: ${summary.total}</p>
          <p>成功: ${summary.passed}</p>
          <p>失敗: ${summary.failed}</p>
          <p>スキップ: ${summary.skipped}</p>
        </div>
        <div class="summary-card">
          <h3>実行時間</h3>
          <p>${summary.duration.toFixed(2)}秒</p>
        </div>
      </div>
      
      <h2>テストタイプ別結果</h2>
      <table>
        <thead>
          <tr>
            <th>タイプ</th>
            <th>合計</th>
            <th>成功</th>
            <th>失敗</th>
            <th>スキップ</th>
            <th>所要時間</th>
            <th>成功率</th>
          </tr>
        </thead>
        <tbody>
          ${resultRows}
        </tbody>
      </table>
      
      ${summary.flakyTests && summary.flakyTests.length > 0 ? `
        <h2>フラッキーテスト (${summary.flakyTests.length}個)</h2>
        <table>
          <thead>
            <tr>
              <th>ファイル</th>
              <th>失敗率</th>
              <th>失敗/実行</th>
            </tr>
          </thead>
          <tbody>
            ${flakyTestRows}
          </tbody>
        </table>
      ` : ''}
      
      <div class="status ${summary.failed > 0 ? 'fail' : 'pass'}">
        ${summary.failed > 0 ? '❌ テストが失敗しました' : '✅ 全てのテストが成功しました'}
      </div>
      
      <p class="timestamp">生成日時: ${new Date(timestamp).toLocaleString()}</p>
    </body>
    </html>
  `;
}

// スクリプトの実行
main().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
