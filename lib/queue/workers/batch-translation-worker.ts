import { Worker, Job } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config';
import { prisma } from '@/lib/db/prisma';
import { BatchJobStatus } from '@prisma/client';
import { 
  addFileProcessingJob, 
  updateBatchJobProgress, 
  markBatchJobAsFailed 
} from '../queue-manager';
import path from 'path';
import fs from 'fs';

/**
 * バッチ翻訳ワーカーを初期化する関数
 */
export function initializeBatchTranslationWorker() {
  const worker = new Worker(
    QUEUE_NAMES.BATCH_TRANSLATION,
    async (job: Job) => {
      console.log(`[Worker] バッチ翻訳ジョブ開始: ${job.id}`);
      const { userId, batchJobId, files, options } = job.data;

      try {
        // バッチジョブの存在確認
        const batchJob = await prisma.BatchJob.findUnique({
          where: { id: batchJobId }
        });

        if (!batchJob) {
          throw new Error(`バッチジョブが見つかりません: ${batchJobId}`);
        }

        // 各ファイルに対して処理ジョブを作成
        for (const file of files) {
          await addFileProcessingJob(userId, batchJobId, file, options);
          await job.updateProgress({ processedJobs: files.indexOf(file) + 1, totalJobs: files.length });
        }

        console.log(`[Worker] バッチ翻訳ジョブ完了: ${job.id}, ファイル数: ${files.length}`);
        return { success: true, message: `${files.length}個のファイル処理ジョブを作成しました` };
      } catch (error) {
        console.error(`[Worker] バッチ翻訳ジョブエラー: ${job.id}`, error);
        // エラー情報を記録
        await markBatchJobAsFailed(batchJobId, {
          message: error instanceof Error ? error.message : '不明なエラー',
          stack: error instanceof Error ? error.stack : null,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    },
    { connection: redisConnection }
  );

  // イベントハンドラーの設定
  worker.on('completed', (job) => {
    console.log(`[Worker] バッチ翻訳ジョブ正常終了: ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] バッチ翻訳ジョブ失敗: ${job?.id}`, error);
  });

  worker.on('error', (error) => {
    console.error('[Worker] バッチ翻訳ワーカーエラー:', error);
  });

  console.log('[Worker] バッチ翻訳ワーカーを初期化しました');
  return worker;
}
