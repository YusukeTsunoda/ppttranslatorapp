#!/usr/bin/env tsx
/**
 * バッチワーカーモニタリングツール
 * 
 * バッチジョブの状態を監視・管理するCLIツール
 * React InkライブラリでTUI（ターミナルUI）を提供
 * 
 * 機能:
 * - 現在実行中および待機中のジョブ一覧表示
 * - ジョブの詳細情報表示
 * - ジョブの中断・再開・削除
 * 
 * 使用方法:
 * npx tsx scripts/batch-worker-monitor.tsx
 * または
 * yarn batch-monitor
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import Table from 'ink-table';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// Prismaクライアントの初期化
const prisma = new PrismaClient();

// メインアプリコンポーネント
const App: React.FC = () => {
  const { exit } = useApp();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [jobDetail, setJobDetail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ジョブデータをロード
  const loadJobs = async () => {
    try {
      setLoading(true);
      const allJobs = await prisma.batchJob.findMany({
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ],
        take: 20 // 最新20件のみ表示
      });
      
      setJobs(allJobs.map(job => ({
        ID: job.id.substring(0, 8) + '...',
        ユーザー: job.userId.substring(0, 8) + '...',
        状態: job.status,
        ファイル数: job.totalFiles,
        処理済: job.processedFiles,
        作成日時: new Date(job.createdAt).toLocaleString('ja-JP'),
        更新日時: new Date(job.updatedAt).toLocaleString('ja-JP')
      })));
      
      setError(null);
    } catch (err) {
      setError(`ジョブ情報の取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ジョブ詳細を読み込む
  const loadJobDetail = async (jobId: string) => {
    try {
      setLoading(true);
      const job = await prisma.batchJob.findUnique({
        where: { id: jobId }
      });
      
      if (!job) {
        throw new Error('ジョブが見つかりません');
      }
      
      setJobDetail(job);
      setError(null);
    } catch (err) {
      setError(`ジョブ詳細の取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ジョブをキャンセル
  const cancelJob = async (jobId: string) => {
    try {
      setLoading(true);
      await prisma.batchJob.update({
        where: { id: jobId },
        data: {
          status: 'CANCELLED',
          errorDetails: {
            message: 'ユーザーによりキャンセルされました',
            timestamp: new Date().toISOString()
          }
        }
      });
      
      await loadJobs();
      setError(null);
    } catch (err) {
      setError(`ジョブのキャンセルに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // キーボード入力処理
  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
    
    if (view === 'list') {
      if (key.downArrow) {
        setSelectedJob(jobs.length > 0 ? jobs[0].ID : null);
      }
      
      if (key.return && selectedJob) {
        setView('detail');
        const fullJobId = jobs.find(j => j.ID === selectedJob)?.id;
        if (fullJobId) {
          loadJobDetail(fullJobId);
        }
      }
    } else if (view === 'detail') {
      if (key.escape) {
        setView('list');
        setJobDetail(null);
      }
      
      if (input === 'c' && jobDetail) {
        cancelJob(jobDetail.id);
      }
    }
  });

  // 初期データロード
  useEffect(() => {
    loadJobs();
    
    // 定期的に更新
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  // ジョブリスト表示
  const renderJobList = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>バッチジョブモニター</Text>
        <Text> (q:終了 ↓:選択 Enter:詳細)</Text>
      </Box>
      
      {loading ? (
        <Box>
          <Text color="green">
            <Spinner type="dots" />
            <Text> データを読み込み中...</Text>
          </Text>
        </Box>
      ) : jobs.length > 0 ? (
        <Table data={jobs} />
      ) : (
        <Text>ジョブはありません</Text>
      )}
      
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );

  // ジョブ詳細表示
  const renderJobDetail = () => {
    if (!jobDetail) {
      return (
        <Box>
          <Text>読み込み中...</Text>
        </Box>
      );
    }
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>ジョブ詳細</Text>
          <Text> (ESC:戻る c:キャンセル)</Text>
        </Box>
        
        <Box flexDirection="column" marginBottom={1}>
          <Text>ID: {jobDetail.id}</Text>
          <Text>ユーザー: {jobDetail.userId}</Text>
          <Text>状態: <Text color={getStatusColor(jobDetail.status)}>{jobDetail.status}</Text></Text>
          <Text>ファイル数: {jobDetail.totalFiles}</Text>
          <Text>処理済み: {jobDetail.processedFiles}</Text>
          <Text>失敗: {jobDetail.failedFiles}</Text>
          <Text>作成日時: {new Date(jobDetail.createdAt).toLocaleString('ja-JP')}</Text>
          <Text>更新日時: {new Date(jobDetail.updatedAt).toLocaleString('ja-JP')}</Text>
          {jobDetail.startedAt && (
            <Text>開始日時: {new Date(jobDetail.startedAt).toLocaleString('ja-JP')}</Text>
          )}
          {jobDetail.completedAt && (
            <Text>完了日時: {new Date(jobDetail.completedAt).toLocaleString('ja-JP')}</Text>
          )}
        </Box>
        
        {jobDetail.errorDetails && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="red">エラー情報:</Text>
            <Text>{JSON.stringify(jobDetail.errorDetails, null, 2)}</Text>
          </Box>
        )}
        
        {jobDetail.results && (
          <Box flexDirection="column">
            <Text bold>処理結果:</Text>
            <Text>{JSON.stringify(jobDetail.results, null, 2)}</Text>
          </Box>
        )}
      </Box>
    );
  };

  // ステータスに応じた色を取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'yellow';
      case 'PROCESSING': return 'blue';
      case 'COMPLETED': return 'green';
      case 'FAILED': return 'red';
      case 'CANCELLED': return 'gray';
      default: return 'white';
    }
  };

  return view === 'list' ? renderJobList() : renderJobDetail();
};

// アプリケーション実行
render(<App />);

// 終了時の処理
process.on('exit', async () => {
  await prisma.$disconnect();
}); 