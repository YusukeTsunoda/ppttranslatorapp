#!/usr/bin/env node

/**
 * アラート通知設定スクリプト
 * 
 * このスクリプトは以下の機能を提供します：
 * - Slack通知の設定
 * - アラートルールの設定
 * - エスカレーションポリシーの設定
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 環境変数の確認
const requiredEnvVars = [
  'SLACK_WEBHOOK_URL',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(`エラー: 以下の環境変数が設定されていません: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// アラート設定ファイルのパス
const alertConfigPath = path.resolve(process.cwd(), 'alert-config.json');

// デフォルトのアラート設定
const defaultAlertConfig = {
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channels: {
      alerts: '#alerts',
      deployments: '#deployments',
      performance: '#performance',
    },
  },
  rules: [
    {
      name: 'エラー発生率の増加',
      description: '短時間に多数のエラーが発生した場合に通知します',
      threshold: {
        type: 'count',
        value: 10,
        timeWindow: 5, // 分
      },
      severity: 'critical',
      notificationChannels: ['alerts'],
    },
    {
      name: 'API応答時間の低下',
      description: 'APIの応答時間が閾値を超えた場合に通知します',
      threshold: {
        type: 'latency',
        value: 1000, // ミリ秒
        timeWindow: 5, // 分
      },
      severity: 'warning',
      notificationChannels: ['alerts'],
    },
    {
      name: 'メモリ使用率の増加',
      description: 'サーバーのメモリ使用率が閾値を超えた場合に通知します',
      threshold: {
        type: 'percentage',
        value: 85, // パーセント
        timeWindow: 10, // 分
      },
      severity: 'warning',
      notificationChannels: ['alerts'],
    },
    {
      name: 'デプロイ完了',
      description: 'デプロイが完了した場合に通知します',
      threshold: {
        type: 'event',
        value: 'deployment_completed',
      },
      severity: 'info',
      notificationChannels: ['deployments'],
    },
    {
      name: 'パフォーマンススコアの低下',
      description: 'Lighthouseパフォーマンススコアが閾値を下回った場合に通知します',
      threshold: {
        type: 'score',
        value: 80, // 100点満点中のスコア
      },
      severity: 'warning',
      notificationChannels: ['performance'],
    },
  ],
  escalationPolicies: [
    {
      name: '重大なエラー',
      description: '重大なエラーが発生した場合のエスカレーションポリシー',
      steps: [
        {
          action: 'notify',
          targets: ['alerts'],
          delay: 0, // 即時通知
        },
        {
          action: 'notify',
          targets: ['@oncall-engineer'],
          delay: 15, // 15分後に通知
        },
        {
          action: 'notify',
          targets: ['@tech-lead'],
          delay: 30, // 30分後に通知
        },
      ],
    },
    {
      name: '警告レベルのアラート',
      description: '警告レベルのアラートが発生した場合のエスカレーションポリシー',
      steps: [
        {
          action: 'notify',
          targets: ['alerts'],
          delay: 0, // 即時通知
        },
        {
          action: 'notify',
          targets: ['@oncall-engineer'],
          delay: 60, // 60分後に通知
        },
      ],
    },
  ],
  onCallRotation: {
    engineers: [
      'engineer1@example.com',
      'engineer2@example.com',
      'engineer3@example.com',
    ],
    rotationPeriod: 'weekly', // weekly, daily, monthly
    startDate: '2023-01-01',
    timezone: 'Asia/Tokyo',
  },
};

// アラート設定ファイルの作成
console.log('アラート設定ファイルを作成しています...');
fs.writeFileSync(alertConfigPath, JSON.stringify(defaultAlertConfig, null, 2));
console.log(`アラート設定ファイルを ${alertConfigPath} に保存しました`);

// Slack通知テスト
console.log('Slack通知のテストを行います...');
try {
  const curlCommand = `curl -X POST -H 'Content-type: application/json' --data '{"text":"🔔 アラート通知システムのテストです。このメッセージが表示されていれば、Slack通知の設定は正常です。"}' ${process.env.SLACK_WEBHOOK_URL}`;
  
  // 実際の環境では以下を実行
  // execSync(curlCommand);
  
  console.log('Slack通知テストを実行するには、以下のコマンドを実行してください:');
  console.log(curlCommand);
  
  console.log('\nアラート通知の設定が完了しました！');
  console.log('次のステップ:');
  console.log('1. alert-config.jsonファイルを確認し、必要に応じて設定を調整してください');
  console.log('2. オンコール担当者のローテーション設定を更新してください');
  console.log('3. 実際のモニタリングシステム（Datadog, New Relic, Grafanaなど）に設定を適用してください');
  
} catch (error) {
  console.error('Slack通知テスト中にエラーが発生しました:', error.message);
  process.exit(1);
}
