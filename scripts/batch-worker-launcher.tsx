#!/usr/bin/env tsx
/**
 * バッチワーカーランチャー
 * 
 * バッチワーカーを起動・管理するツール
 * React Inkを使用したインタラクティブなCLIインターフェース
 * 
 * 機能:
 * - ワーカーの起動・停止
 * - ジョブキューのステータス確認
 * - 処理設定のカスタマイズ
 * 
 * 使用方法:
 * npx tsx scripts/batch-worker-launcher.tsx
 * または
 * yarn batch-launcher
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { spawn, ChildProcess } from 'child_process';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// Prismaクライアントの初期化
const prisma = new PrismaClient();

// ワーカー設定オプション
interface WorkerConfig {
  poolSize: number;
  pollingInterval: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// メニュー項目の定義
const menuItems = [
  { label: 'ワーカーを起動', value: 'start' },
  { label: 'ワーカーを停止', value: 'stop' },
  { label: 'ステータスを表示', value: 'status' },
  { label: '設定を変更', value: 'config' },
  { label: '終了', value: 'exit' }
];

// メインアプリコンポーネント
const App: React.FC = () => {
  const { exit } = useApp();
  const [workerProcess, setWorkerProcess] = useState<ChildProcess | null>(null);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [workerOutput, setWorkerOutput] = useState<string[]>([]);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'menu' | 'output' | 'config'>('menu');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<WorkerConfig>({
    poolSize: 2,
    pollingInterval: 60,
    logLevel: 'info'
  });

  // ジョブステータスを取得
  const getJobStatus = async () => {
    try {
      setLoading(true);
      
      const pendingCount = await prisma.batchJob.count({
        where: { status: 'PENDING' }
      });
      
      const processingCount = await prisma.batchJob.count({
        where: { status: 'PROCESSING' }
      });
      
      const completedCount = await prisma.batchJob.count({
        where: { status: 'COMPLETED' }
      });
      
      const failedCount = await prisma.batchJob.count({
        where: { status: 'FAILED' }
      });
      
      setJobStatus({
        pending: pendingCount,
        processing: processingCount,
        completed: completedCount,
        failed: failedCount,
        timestamp: new Date()
      });
      
      setError(null);
    } catch (err) {
      setError(`ジョブステータスの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ワーカーを起動
  const startWorker = () => {
    if (workerRunning) {
      setError('ワーカーは既に実行中です');
      return;
    }
    
    try {
      const workerPath = path.join(process.cwd(), 'scripts', 'batch-worker.ts');
      
      // 環境変数にワーカー設定を追加
      const env = {
        ...process.env,
        WORKER_POOL_SIZE: config.poolSize.toString(),
        WORKER_POLLING_INTERVAL: (config.pollingInterval * 1000).toString(),
        WORKER_LOG_LEVEL: config.logLevel
      };
      
      // ワーカープロセスを起動
      const process = spawn('npx', ['ts-node', workerPath], { env });
      setWorkerProcess(process);
      setWorkerRunning(true);
      setWorkerOutput([]);
      setView('output');
      
      // 出力を取得
      process.stdout.on('data', (data) => {
        const text = data.toString();
        setWorkerOutput(prev => [...prev, text]);
      });
      
      process.stderr.on('data', (data) => {
        const text = data.toString();
        setWorkerOutput(prev => [...prev, `[ERROR] ${text}`]);
      });
      
      // プロセス終了時の処理
      process.on('close', (code) => {
        setWorkerRunning(false);
        setWorkerOutput(prev => [...prev, `ワーカープロセスが終了しました（終了コード: ${code}）`]);
      });
      
      setError(null);
    } catch (err) {
      setError(`ワーカーの起動に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ワーカーを停止
  const stopWorker = () => {
    if (!workerRunning || !workerProcess) {
      setError('実行中のワーカーがありません');
      return;
    }
    
    try {
      workerProcess.kill('SIGINT');
      setWorkerOutput(prev => [...prev, 'ワーカーに終了シグナルを送信しました']);
      setError(null);
    } catch (err) {
      setError(`ワーカーの停止に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // メニュー選択時の処理
  const handleMenuSelect = ({ value }: { value: string }) => {
    switch (value) {
      case 'start':
        startWorker();
        break;
      case 'stop':
        stopWorker();
        break;
      case 'status':
        getJobStatus();
        break;
      case 'config':
        setView('config');
        break;
      case 'exit':
        if (workerRunning && workerProcess) {
          workerProcess.kill('SIGINT');
        }
        exit();
        break;
    }
  };

  // キーボード入力処理
  useInput((input, key) => {
    if (input === 'q' && view !== 'menu') {
      setView('menu');
    }
    
    if (key.escape && view !== 'menu') {
      setView('menu');
    }
  });

  // メニュー画面の表示
  const renderMenu = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>バッチワーカー管理ツール</Text>
      </Box>
      
      <SelectInput items={menuItems} onSelect={handleMenuSelect} />
      
      {loading && (
        <Box marginTop={1}>
          <Text color="green">
            <Spinner type="dots" />
            <Text> 処理中...</Text>
          </Text>
        </Box>
      )}
      
      {jobStatus && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" paddingX={1}>
          <Text bold>バッチジョブ状況</Text>
          <Text>待機中: <Text color="yellow">{jobStatus.pending}</Text></Text>
          <Text>処理中: <Text color="blue">{jobStatus.processing}</Text></Text>
          <Text>完了: <Text color="green">{jobStatus.completed}</Text></Text>
          <Text>失敗: <Text color="red">{jobStatus.failed}</Text></Text>
          <Text dimColor>最終更新: {jobStatus.timestamp.toLocaleString('ja-JP')}</Text>
        </Box>
      )}
      
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );

  // ワーカー出力画面の表示
  const renderOutput = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>ワーカー出力</Text>
        <Text> (ESC/q: メニューに戻る)</Text>
        <Text color={workerRunning ? 'green' : 'red'}> [状態: {workerRunning ? '実行中' : '停止'}]</Text>
      </Box>
      
      <Box flexDirection="column" height={20} overflowY="scroll">
        {workerOutput.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );

  // 設定画面の表示
  const renderConfig = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>ワーカー設定</Text>
        <Text> (ESC/q: メニューに戻る)</Text>
      </Box>
      
      <Box flexDirection="column">
        <Text>ワーカープール数: {config.poolSize}</Text>
        <Text>ポーリング間隔: {config.pollingInterval}秒</Text>
        <Text>ログレベル: {config.logLevel}</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text>※ 設定を変更するには package.json の scripts セクションを編集してください</Text>
      </Box>
    </Box>
  );

  // 表示するビューの選択
  const getView = () => {
    switch (view) {
      case 'menu':
        return renderMenu();
      case 'output':
        return renderOutput();
      case 'config':
        return renderConfig();
      default:
        return renderMenu();
    }
  };

  // 初期データロード
  useEffect(() => {
    getJobStatus();
    
    // クリーンアップ
    return () => {
      if (workerProcess) {
        workerProcess.kill('SIGINT');
      }
    };
  }, []);

  return getView();
};

// アプリケーション実行
render(<App />);

// 終了時の処理
process.on('exit', async () => {
  await prisma.$disconnect();
}); 