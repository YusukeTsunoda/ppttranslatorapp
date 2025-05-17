import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redisConnection, QUEUE_NAMES, JOB_SETTINGS } from './config';
import { prisma } from '@/lib/db/prisma';
import { BatchJobStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';

// キューインスタンスを保持するオブジェクト
const queues: Record<string, Queue> = {};

/**
 * キューを初期化する関数
 */
export function initializeQueues() {
  // バッチ翻訳キューの初期化
  if (!queues[QUEUE_NAMES.BATCH_TRANSLATION]) {
    queues[QUEUE_NAMES.BATCH_TRANSLATION] = new Queue(QUEUE_NAMES.BATCH_TRANSLATION, {
      connection: redisConnection,
      defaultJobOptions: JOB_SETTINGS,
    });
    console.log(`[Queue] ${QUEUE_NAMES.BATCH_TRANSLATION} キューを初期化しました`);
  }

  // ファイル処理キューの初期化
  if (!queues[QUEUE_NAMES.FILE_PROCESSING]) {
    queues[QUEUE_NAMES.FILE_PROCESSING] = new Queue(QUEUE_NAMES.FILE_PROCESSING, {
      connection: redisConnection,
      defaultJobOptions: JOB_SETTINGS,
    });
    console.log(`[Queue] ${QUEUE_NAMES.FILE_PROCESSING} キューを初期化しました`);
  }

  // 翻訳キューの初期化
  if (!queues[QUEUE_NAMES.TRANSLATION]) {
    queues[QUEUE_NAMES.TRANSLATION] = new Queue(QUEUE_NAMES.TRANSLATION, {
      connection: redisConnection,
      defaultJobOptions: JOB_SETTINGS,
    });
    console.log(`[Queue] ${QUEUE_NAMES.TRANSLATION} キューを初期化しました`);
  }
}

/**
 * 指定されたキュー名のキューを取得する関数
 */
export function getQueue(queueName: string): Queue | null {
  if (!queues[queueName]) {
    initializeQueues();
  }
  return queues[queueName] || null;
}

/**
 * バッチ翻訳ジョブを追加する関数
 */
export async function addBatchTranslationJob(
  userId: string,
  batchJobId: string,
  files: Array<{ name: string, path: string }>,
  options: any
) {
  const queue = getQueue(QUEUE_NAMES.BATCH_TRANSLATION);
  if (!queue) {
    throw new Error('バッチ翻訳キューが初期化されていません');
  }

  // バッチジョブのステータスを更新
  await prisma.BatchJob.update({
    where: { id: batchJobId },
    data: {
      status: BatchJobStatus.PROCESSING,
      startedAt: new Date(),
    }
  });

  // ジョブをキューに追加
  const job = await queue.add('process-batch', {
    userId,
    batchJobId,
    files,
    options,
  });

  console.log(`[Queue] バッチ翻訳ジョブを追加しました: ${job.id}`);
  return job.id;
}

/**
 * 単一ファイルの処理ジョブを追加する関数
 */
export async function addFileProcessingJob(
  userId: string,
  batchJobId: string,
  file: { name: string, path: string },
  options: any
) {
  const queue = getQueue(QUEUE_NAMES.FILE_PROCESSING);
  if (!queue) {
    throw new Error('ファイル処理キューが初期化されていません');
  }

  // ジョブをキューに追加
  const job = await queue.add('process-file', {
    userId,
    batchJobId,
    file,
    options,
  });

  console.log(`[Queue] ファイル処理ジョブを追加しました: ${job.id}, ファイル: ${file.name}`);
  return job.id;
}

/**
 * 翻訳ジョブを追加する関数
 */
export async function addTranslationJob(
  userId: string,
  batchJobId: string,
  fileId: string,
  texts: Array<{ id: string, text: string }>,
  options: any
) {
  const queue = getQueue(QUEUE_NAMES.TRANSLATION);
  if (!queue) {
    throw new Error('翻訳キューが初期化されていません');
  }

  // ジョブをキューに追加
  const job = await queue.add('translate-texts', {
    userId,
    batchJobId,
    fileId,
    texts,
    options,
  });

  console.log(`[Queue] 翻訳ジョブを追加しました: ${job.id}, テキスト数: ${texts.length}`);
  return job.id;
}

/**
 * バッチジョブの進捗を更新する関数
 */
export async function updateBatchJobProgress(
  batchJobId: string,
  processedFiles: number,
  failedFiles: number = 0
) {
  try {
    // 現在のジョブ情報を取得
    const job = await prisma.BatchJob.findUnique({
      where: { id: batchJobId }
    });

    if (!job) {
      console.error(`[Queue] バッチジョブが見つかりません: ${batchJobId}`);
      return;
    }

    // 進捗を更新
    await prisma.BatchJob.update({
      where: { id: batchJobId },
      data: {
        processedFiles,
        failedFiles,
        status: processedFiles + failedFiles >= job.totalFiles 
          ? BatchJobStatus.COMPLETED 
          : BatchJobStatus.PROCESSING,
        completedAt: processedFiles + failedFiles >= job.totalFiles 
          ? new Date() 
          : undefined,
      }
    });

    console.log(`[Queue] バッチジョブ進捗更新: ${batchJobId}, 処理済み: ${processedFiles}/${job.totalFiles}`);
  } catch (error) {
    console.error(`[Queue] バッチジョブ進捗更新エラー:`, error);
  }
}

/**
 * バッチジョブをエラー状態に更新する関数
 */
export async function markBatchJobAsFailed(
  batchJobId: string,
  errorDetails: any
) {
  try {
    await prisma.BatchJob.update({
      where: { id: batchJobId },
      data: {
        status: BatchJobStatus.FAILED,
        errorDetails,
        completedAt: new Date(),
      }
    });
    console.log(`[Queue] バッチジョブをエラー状態に更新: ${batchJobId}`);
  } catch (error) {
    console.error(`[Queue] バッチジョブエラー状態更新失敗:`, error);
  }
}

/**
 * ファイルの一時保存ディレクトリを作成する関数
 */
export async function createTempDirectory(userId: string, fileId: string) {
  // 新しいファイルパス構造: /tmp/users/{userId}/{fileId}/slides
  const tempDir = path.join('/tmp', 'users', userId, fileId, 'slides');
  
  try {
    await mkdir(tempDir, { recursive: true });
    return tempDir;
  } catch (error) {
    console.error(`[Queue] 一時ディレクトリ作成エラー:`, error);
    // 代替ディレクトリを試行
    const fallbackDir = path.join('/tmp', `user_${userId}_${fileId}_slides`);
    await mkdir(fallbackDir, { recursive: true });
    return fallbackDir;
  }
}
