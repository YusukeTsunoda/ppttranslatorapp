import { Worker, Job } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config';
import { prisma } from '@/lib/db/prisma';
import { Language } from '@prisma/client';
import { translateText } from '@/lib/translation/translator';
import { normalizeTranslationResult } from '@/lib/translation/normalize';

/**
 * 翻訳ワーカーを初期化する関数
 */
export function initializeTranslationWorker() {
  const worker = new Worker(
    QUEUE_NAMES.TRANSLATION,
    async (job: Job) => {
      console.log(`[Worker] 翻訳ジョブ開始: ${job.id}`);
      const { userId, batchJobId, fileId, texts, options } = job.data;

      try {
        // オプションから言語設定を取得
        const sourceLang = (options.sourceLang || 'ja') as Language;
        const targetLang = (options.targetLang || 'en') as Language;
        const model = options.model || 'claude-3-sonnet-20241022';

        // テキストを分割して処理（APIの文字数制限対応）
        const chunkSize = 10; // 一度に処理するテキスト数
        const chunks = [];
        
        for (let i = 0; i < texts.length; i += chunkSize) {
          chunks.push(texts.slice(i, i + chunkSize));
        }

        // 各チャンクを処理
        let processedCount = 0;
        for (const chunk of chunks) {
          // 進捗を更新
          await job.updateProgress({ 
            processedTexts: processedCount, 
            totalTexts: texts.length 
          });

          // 各テキストを翻訳
          for (const textItem of chunk) {
            try {
              // 翻訳を実行
              const translationResult = await translateText(
                textItem.text,
                sourceLang,
                targetLang,
                model
              );

              // 翻訳結果を正規化（余分なテキストを削除）
              const normalizedTranslation = normalizeTranslationResult(translationResult);

              // 翻訳結果をデータベースに保存
              await prisma.Translation.create({
                data: {
                  id: `${textItem.id}_${targetLang}`,
                  textId: textItem.id,
                  sourceLang,
                  targetLang,
                  model,
                  translation: normalizedTranslation,
                  updatedAt: new Date(),
                }
              });

              processedCount++;
            } catch (error) {
              console.error(`[Worker] テキスト翻訳エラー: ${textItem.id}`, error);
              
              // エラーが発生しても続行（失敗したテキストをスキップ）
              await prisma.Translation.create({
                data: {
                  id: `${textItem.id}_${targetLang}`,
                  textId: textItem.id,
                  sourceLang,
                  targetLang,
                  model,
                  translation: `[翻訳エラー: ${error instanceof Error ? error.message : '不明なエラー'}]`,
                  updatedAt: new Date(),
                }
              });
              
              processedCount++;
            }
          }
        }

        // 翻訳履歴を作成
        await prisma.TranslationHistory.create({
          data: {
            userId,
            fileId,
            sourceLang,
            targetLang,
            model,
            creditsUsed: texts.length,
            status: 'COMPLETED',
            pageCount: 0, // 後で更新
            fileSize: 0,  // 後で更新
            processingTime: 0, // 後で更新
            updatedAt: new Date(),
          }
        });

        console.log(`[Worker] 翻訳ジョブ完了: ${job.id}, テキスト数: ${texts.length}`);
        return { 
          success: true, 
          translatedCount: processedCount,
          totalCount: texts.length
        };
      } catch (error) {
        console.error(`[Worker] 翻訳ジョブエラー: ${job.id}`, error);
        
        // 翻訳履歴にエラーを記録
        await prisma.TranslationHistory.create({
          data: {
            userId,
            fileId,
            sourceLang: (options.sourceLang || 'ja') as Language,
            targetLang: (options.targetLang || 'en') as Language,
            model: options.model || 'claude-3-sonnet-20241022',
            creditsUsed: 0,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : '不明なエラー',
            pageCount: 0,
            fileSize: 0,
            processingTime: 0,
            updatedAt: new Date(),
          }
        });
        
        throw error;
      }
    },
    { connection: redisConnection, concurrency: 2 }
  );

  // イベントハンドラーの設定
  worker.on('completed', (job) => {
    console.log(`[Worker] 翻訳ジョブ正常終了: ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] 翻訳ジョブ失敗: ${job?.id}`, error);
  });

  worker.on('error', (error) => {
    console.error('[Worker] 翻訳ワーカーエラー:', error);
  });

  console.log('[Worker] 翻訳ワーカーを初期化しました');
  return worker;
}
