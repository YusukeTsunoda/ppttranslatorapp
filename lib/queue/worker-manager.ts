import { initializeQueues } from './queue-manager';
import { initializeBatchTranslationWorker } from './workers/batch-translation-worker';
import { initializeFileProcessingWorker } from './workers/file-processing-worker';
import { initializeTranslationWorker } from './workers/translation-worker';

// ワーカーインスタンスを保持する変数
let batchTranslationWorker: ReturnType<typeof initializeBatchTranslationWorker> | null = null;
let fileProcessingWorker: ReturnType<typeof initializeFileProcessingWorker> | null = null;
let translationWorker: ReturnType<typeof initializeTranslationWorker> | null = null;

/**
 * すべてのワーカーを初期化する関数
 */
export function initializeAllWorkers() {
  // キューを初期化
  initializeQueues();
  
  // 各ワーカーを初期化
  if (!batchTranslationWorker) {
    batchTranslationWorker = initializeBatchTranslationWorker();
  }
  
  if (!fileProcessingWorker) {
    fileProcessingWorker = initializeFileProcessingWorker();
  }
  
  if (!translationWorker) {
    translationWorker = initializeTranslationWorker();
  }
  
  console.log('[WorkerManager] すべてのワーカーを初期化しました');
}

/**
 * すべてのワーカーを停止する関数
 */
export async function shutdownAllWorkers() {
  const shutdownPromises = [];
  
  if (batchTranslationWorker) {
    shutdownPromises.push(batchTranslationWorker.close());
    batchTranslationWorker = null;
  }
  
  if (fileProcessingWorker) {
    shutdownPromises.push(fileProcessingWorker.close());
    fileProcessingWorker = null;
  }
  
  if (translationWorker) {
    shutdownPromises.push(translationWorker.close());
    translationWorker = null;
  }
  
  await Promise.all(shutdownPromises);
  console.log('[WorkerManager] すべてのワーカーを停止しました');
}

// サーバー起動時にワーカーを初期化
if (process.env.NODE_ENV !== 'test') {
  initializeAllWorkers();
  
  // プロセス終了時にワーカーを停止
  process.on('SIGTERM', async () => {
    console.log('[WorkerManager] SIGTERM受信、ワーカーを停止します');
    await shutdownAllWorkers();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('[WorkerManager] SIGINT受信、ワーカーを停止します');
    await shutdownAllWorkers();
    process.exit(0);
  });
}
