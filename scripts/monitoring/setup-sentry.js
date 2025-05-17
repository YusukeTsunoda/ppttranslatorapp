#!/usr/bin/env node

/**
 * Sentryセットアップスクリプト
 * 
 * このスクリプトはSentryの初期設定を行います。
 * - プロジェクトの作成
 * - 環境の設定（開発、ステージング、本番）
 * - アラートルールの設定
 * - ソースマップのアップロード設定
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

// Sentryの設定ファイルを作成
const sentryConfigPath = path.resolve(process.cwd(), '.sentryclirc');
const sentryConfig = `[auth]
token=${process.env.SENTRY_AUTH_TOKEN}

[defaults]
org=${process.env.SENTRY_ORG}
project=${process.env.SENTRY_PROJECT}
`;

fs.writeFileSync(sentryConfigPath, sentryConfig);
console.log('Sentryの設定ファイルを作成しました');

// Sentryプロジェクトの初期設定
try {
  console.log('Sentryプロジェクトの初期設定を行います...');
  
  // プロジェクトが存在しない場合は作成
  try {
    execSync(`npx @sentry/cli projects list | grep ${process.env.SENTRY_PROJECT}`);
    console.log(`プロジェクト ${process.env.SENTRY_PROJECT} は既に存在します`);
  } catch (error) {
    console.log(`プロジェクト ${process.env.SENTRY_PROJECT} を作成します`);
    execSync(`npx @sentry/cli projects create ${process.env.SENTRY_PROJECT} --platform javascript-react`);
  }
  
  // 環境の設定
  console.log('環境を設定します...');
  const environments = ['development', 'staging', 'production'];
  environments.forEach(env => {
    try {
      execSync(`npx @sentry/cli repos list-configs | grep ${env}`);
      console.log(`環境 ${env} は既に設定されています`);
    } catch (error) {
      console.log(`環境 ${env} を設定します`);
      execSync(`npx @sentry/cli repos set-config --environment=${env}`);
    }
  });
  
  // アラートルールの設定
  console.log('アラートルールを設定します...');
  const alertRules = [
    {
      name: 'エラー発生率の増加',
      trigger: 'issue_occurrence_count',
      threshold: 10,
      timeWindow: 10,
      environment: 'production',
    },
    {
      name: '重大なエラーの検出',
      trigger: 'event_frequency',
      threshold: 5,
      timeWindow: 5,
      environment: 'production',
      level: 'fatal',
    },
  ];
  
  // アラートルールの作成はSentry APIを使用する必要があるため、
  // ここではコマンドラインでの設定方法を表示
  console.log('\nアラートルールの設定方法:');
  alertRules.forEach(rule => {
    console.log(`
Sentryダッシュボードで以下のアラートルールを作成してください:
- 名前: ${rule.name}
- トリガー: ${rule.trigger}
- しきい値: ${rule.threshold}
- 時間枠: ${rule.timeWindow}分
- 環境: ${rule.environment}
${rule.level ? `- レベル: ${rule.level}` : ''}
    `);
  });
  
  // ソースマップのアップロード設定
  console.log('ソースマップのアップロード設定を行います...');
  const sentryWebpackPath = path.resolve(process.cwd(), 'sentry.webpack.config.js');
  const sentryWebpackConfig = `
const { withSentryConfig } = require('@sentry/nextjs');

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
};

module.exports = withSentryConfig(
  {
    // 既存のNext.js設定
  },
  sentryWebpackPluginOptions
);
`;

  fs.writeFileSync(sentryWebpackPath, sentryWebpackConfig);
  console.log('Sentryのwebpack設定ファイルを作成しました');
  
  console.log('\nSentryの初期設定が完了しました！');
  console.log('次のステップ:');
  console.log('1. @sentry/nextjs パッケージをインストールしてください: npm install @sentry/nextjs');
  console.log('2. Next.jsプロジェクトにSentryを統合するには、next.config.jsを更新してください');
  console.log('3. Sentryダッシュボードでアラートルールを設定してください');
  
} catch (error) {
  console.error('Sentryの設定中にエラーが発生しました:', error.message);
  process.exit(1);
}
