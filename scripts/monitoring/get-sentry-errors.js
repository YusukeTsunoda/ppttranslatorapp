#!/usr/bin/env node

/**
 * Sentryからエラーレポートを取得するスクリプト
 * 
 * このスクリプトは以下の機能を提供します：
 * - 過去24時間のエラーを取得
 * - エラーの重要度に基づいて分類
 * - 重大なエラーがある場合は環境変数を設定
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 環境変数の確認
const requiredEnvVars = [
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(`エラー: 以下の環境変数が設定されていません: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// 現在時刻と24時間前の時刻を取得
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

// ISO形式の日時文字列を取得
const nowStr = now.toISOString();
const yesterdayStr = yesterday.toISOString();

// エラーレポートの取得
try {
  console.log('Sentryからエラーレポートを取得しています...');
  
  // Sentryからイベントを取得
  const command = `npx @sentry/cli events list --environment=production --since=${yesterdayStr} --until=${nowStr} --json`;
  const eventsOutput = execSync(command).toString();
  
  // JSONとして解析
  let events = [];
  try {
    events = JSON.parse(eventsOutput);
  } catch (error) {
    console.error('イベントデータの解析に失敗しました:', error.message);
    console.log('生のイベントデータ:', eventsOutput);
    events = [];
  }
  
  console.log(`過去24時間に ${events.length} 件のイベントが見つかりました`);
  
  // エラーの分類
  const errorsByLevel = {
    fatal: [],
    error: [],
    warning: [],
    info: [],
  };
  
  events.forEach(event => {
    const level = event.level || 'error';
    if (errorsByLevel[level]) {
      errorsByLevel[level].push(event);
    } else {
      errorsByLevel.error.push(event);
    }
  });
  
  // エラーレポートの作成
  const reportPath = path.resolve(process.cwd(), 'error-report.md');
  let report = `# Sentryエラーレポート (${yesterday.toLocaleDateString()} - ${now.toLocaleDateString()})\n\n`;
  
  // 重大なエラーがあるかどうかをチェック
  const hasCriticalErrors = errorsByLevel.fatal.length > 0 || errorsByLevel.error.length > 5;
  
  // 環境変数を設定
  if (hasCriticalErrors) {
    console.log('重大なエラーが検出されました！');
    // GitHub Actionsの環境変数を設定
    fs.appendFileSync(process.env.GITHUB_ENV || '/dev/null', 'HAS_CRITICAL_ERRORS=true\n');
  }
  
  // レベルごとのエラー数を追加
  report += `## エラー概要\n\n`;
  report += `- 致命的なエラー: ${errorsByLevel.fatal.length}\n`;
  report += `- エラー: ${errorsByLevel.error.length}\n`;
  report += `- 警告: ${errorsByLevel.warning.length}\n`;
  report += `- 情報: ${errorsByLevel.info.length}\n\n`;
  
  // 重大なエラーの詳細を追加
  if (errorsByLevel.fatal.length > 0) {
    report += `## 致命的なエラー\n\n`;
    errorsByLevel.fatal.forEach(event => {
      report += `### ${event.title}\n`;
      report += `- イベントID: ${event.id}\n`;
      report += `- タイムスタンプ: ${event.timestamp}\n`;
      report += `- ユーザー: ${event.user || '不明'}\n`;
      report += `- URL: ${event.url || '不明'}\n\n`;
    });
  }
  
  // 通常のエラーの詳細を追加（最大10件）
  if (errorsByLevel.error.length > 0) {
    report += `## エラー（最大10件）\n\n`;
    errorsByLevel.error.slice(0, 10).forEach(event => {
      report += `### ${event.title}\n`;
      report += `- イベントID: ${event.id}\n`;
      report += `- タイムスタンプ: ${event.timestamp}\n`;
      report += `- ユーザー: ${event.user || '不明'}\n`;
      report += `- URL: ${event.url || '不明'}\n\n`;
    });
    
    if (errorsByLevel.error.length > 10) {
      report += `... 他 ${errorsByLevel.error.length - 10} 件のエラー\n\n`;
    }
  }
  
  // レポートを保存
  fs.writeFileSync(reportPath, report);
  console.log(`エラーレポートを ${reportPath} に保存しました`);
  
  // 重大なエラーがある場合は終了コード1で終了
  if (hasCriticalErrors) {
    console.log('重大なエラーが検出されたため、アラートを発生させます');
    process.exit(1);
  }
  
} catch (error) {
  console.error('エラーレポートの取得中にエラーが発生しました:', error.message);
  process.exit(1);
}
