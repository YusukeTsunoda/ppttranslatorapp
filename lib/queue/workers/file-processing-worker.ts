import { Worker, Job } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config';
import { prisma } from '@/lib/db/prisma';
import { 
  addTranslationJob, 
  updateBatchJobProgress, 
  createTempDirectory 
} from '../queue-manager';
import path from 'path';
import fs from 'fs';
import { StreamingPPTXParser } from '@/lib/pptx/pptx-parser';
import { v4 as uuidv4 } from 'uuid';

/**
 * ファイル処理ワーカーを初期化する関数
 */
export function initializeFileProcessingWorker() {
  const worker = new Worker(
    QUEUE_NAMES.FILE_PROCESSING,
    async (job: Job) => {
      console.log(`[Worker] ファイル処理ジョブ開始: ${job.id}`);
      const { userId, batchJobId, file, options } = job.data;

      try {
        // ファイルIDを生成
        const fileId = uuidv4();
        
        // 一時ディレクトリを作成
        const tempDir = await createTempDirectory(userId, fileId);
        
        // ファイル情報をデータベースに登録
        const fileRecord = await prisma.File.create({
          data: {
            id: fileId,
            userId,
            originalName: file.name,
            storagePath: file.path,
            status: 'PROCESSING',
            fileSize: fs.statSync(file.path).size,
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            updatedAt: new Date(),
          }
        });

        // PPTXファイルをパース
        await job.updateProgress({ status: 'parsing' });
        const parser = new StreamingPPTXParser();
        const parseResult = await parser.parsePPTX(file.path, tempDir);
        
        // スライド情報をデータベースに登録
        const slides = [];
        const textGroups = [];
        
        for (let i = 0; i < parseResult.slides.length; i++) {
          const slide = parseResult.slides[i];
          const slideId = uuidv4();
          
          // スライドレコードを作成
          slides.push({
            id: slideId,
            fileId,
            index: i,
            imagePath: slide.image,
            updatedAt: new Date(),
          });
          
          // テキスト情報を収集
          const texts = slide.texts.map(text => ({
            id: uuidv4(),
            slideId,
            text: text.text,
            position: text.position,
            updatedAt: new Date(),
          }));
          
          if (texts.length > 0) {
            textGroups.push({ slideId, texts });
          }
        }
        
        // スライドをデータベースに一括登録
        await prisma.Slide.createMany({
          data: slides
        });
        
        // テキストをデータベースに登録し、翻訳ジョブを作成
        for (const group of textGroups) {
          // テキストを登録
          await prisma.Text.createMany({
            data: group.texts
          });
          
          // 翻訳ジョブを作成
          if (group.texts.length > 0) {
            await addTranslationJob(
              userId,
              batchJobId,
              fileId,
              group.texts.map(t => ({ id: t.id, text: t.text })),
              options
            );
          }
        }
        
        // ファイルのステータスを更新
        await prisma.File.update({
          where: { id: fileId },
          data: {
            status: 'READY',
            updatedAt: new Date(),
          }
        });
        
        // バッチジョブの進捗を更新
        const batchJob = await prisma.BatchJob.findUnique({
          where: { id: batchJobId }
        });
        
        if (batchJob) {
          await updateBatchJobProgress(
            batchJobId,
            batchJob.processedFiles + 1,
            batchJob.failedFiles
          );
        }
        
        console.log(`[Worker] ファイル処理ジョブ完了: ${job.id}, ファイル: ${file.name}`);
        return { 
          success: true, 
          fileId, 
          slideCount: slides.length,
          textCount: textGroups.reduce((sum, group) => sum + group.texts.length, 0)
        };
      } catch (error) {
        console.error(`[Worker] ファイル処理ジョブエラー: ${job.id}`, error);
        
        // バッチジョブの失敗カウントを更新
        const batchJob = await prisma.BatchJob.findUnique({
          where: { id: batchJobId }
        });
        
        if (batchJob) {
          await updateBatchJobProgress(
            batchJobId,
            batchJob.processedFiles,
            batchJob.failedFiles + 1
          );
        }
        
        // エラー情報を詳細に記録
        await prisma.BatchJob.update({
          where: { id: batchJobId },
          data: {
            errorDetails: {
              ...(batchJob?.errorDetails as any || {}),
              files: [
                ...((batchJob?.errorDetails as any)?.files || []),
                {
                  fileName: file.name,
                  error: error instanceof Error ? error.message : '不明なエラー',
                  stack: error instanceof Error ? error.stack : null,
                  timestamp: new Date().toISOString()
                }
              ]
            }
          }
        });
        
        throw error;
      }
    },
    { connection: redisConnection }
  );

  // イベントハンドラーの設定
  worker.on('completed', (job) => {
    console.log(`[Worker] ファイル処理ジョブ正常終了: ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] ファイル処理ジョブ失敗: ${job?.id}`, error);
  });

  worker.on('error', (error) => {
    console.error('[Worker] ファイル処理ワーカーエラー:', error);
  });

  console.log('[Worker] ファイル処理ワーカーを初期化しました');
  return worker;
}
