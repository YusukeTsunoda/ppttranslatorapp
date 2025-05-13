#!/usr/bin/env ts-node
/**
 * バッチ処理ワーカー
 * 
 * スライド翻訳のバッチ処理を行うバックグラウンドワーカー
 * 以下の処理を行います：
 * 1. 待機中のバッチジョブを検索
 * 2. ジョブ内の各ファイルを処理
 * 3. 処理結果をデータベースに記録
 * 
 * 使用方法:
 * npx ts-node scripts/batch-worker.ts
 * または
 * yarn batch-worker
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// Prismaクライアントの初期化
const prisma = new PrismaClient();

// バッチ処理の実行間隔（ミリ秒）
const POLLING_INTERVAL = 60 * 1000; // 1分

// バッチジョブのステータス
enum BatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// メイン処理
async function main() {
  console.log('バッチワーカーを開始しました');
  
  try {
    // 処理中のジョブをリセット（ワーカーが異常終了した場合の対策）
    await resetStalledJobs();
    
    // 定期的にジョブをチェック
    setInterval(processNextJob, POLLING_INTERVAL);
    
    // 初回実行
    await processNextJob();
  } catch (error) {
    console.error('バッチワーカーエラー:', error);
    process.exit(1);
  }
}

// 処理が中断されたジョブをリセット
async function resetStalledJobs() {
  try {
    const stalledJobs = await prisma.batchJob.findMany({
      where: {
        status: BatchStatus.PROCESSING,
        updatedAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000) // 30分以上更新がないジョブ
        }
      }
    });
    
    if (stalledJobs.length > 0) {
      console.log(`中断されたジョブをリセット: ${stalledJobs.length}件`);
      
      for (const job of stalledJobs) {
        await prisma.batchJob.update({
          where: { id: job.id },
          data: {
            status: BatchStatus.PENDING,
            errorDetails: {
              message: '処理が中断されたため再スケジュールされました',
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('ジョブリセットエラー:', error);
  }
}

// 次の待機中ジョブを処理
async function processNextJob() {
  try {
    // 待機中のジョブを1件取得
    const job = await prisma.batchJob.findFirst({
      where: {
        status: BatchStatus.PENDING
      },
      orderBy: {
        createdAt: 'asc' // 古いジョブから処理
      }
    });
    
    if (!job) {
      return; // 処理対象のジョブがない
    }
    
    console.log(`ジョブ処理開始: ${job.id}`);
    
    // ジョブのステータスを処理中に更新
    await prisma.batchJob.update({
      where: { id: job.id },
      data: {
        status: BatchStatus.PROCESSING,
        startedAt: new Date()
      }
    });
    
    // ここでジョブの実際の処理を行う
    // 例: ファイルの処理、翻訳、レポート生成など
    
    // 処理完了を記録
    await prisma.batchJob.update({
      where: { id: job.id },
      data: {
        status: BatchStatus.COMPLETED,
        completedAt: new Date(),
        results: {
          message: '処理が完了しました',
          timestamp: new Date().toISOString()
        }
      }
    });
    
    console.log(`ジョブ処理完了: ${job.id}`);
  } catch (error) {
    console.error('ジョブ処理エラー:', error);
    
    // エラーが発生したジョブがあれば失敗としてマーク
    if (error instanceof Error && 'jobId' in error) {
      const jobId = (error as any).jobId;
      await prisma.batchJob.update({
        where: { id: jobId },
        data: {
          status: BatchStatus.FAILED,
          errorDetails: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        }
      });
    }
  }
}

// プロセス終了時の処理
process.on('SIGINT', async () => {
  console.log('バッチワーカーを終了しています...');
  await prisma.$disconnect();
  process.exit(0);
});

// プログラム実行
main().catch(e => {
  console.error(e);
  process.exit(1);
}); 