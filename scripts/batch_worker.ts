import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

async function processBatchJobs() {
  while (true) {
    // PENDINGのジョブを取得
    const jobs = await prisma.batchJob.findMany({ where: { status: 'PENDING' } });
    for (const job of jobs) {
      try {
        // ジョブをPROCESSINGに
        await prisma.batchJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });
        const files = Array.isArray(job.files) ? job.files : [];
        let progress = 0;
        let error: string | null = null;
        for (let i = 0; i < files.length; i++) {
          const file: any = files[i];
          if (!file) continue; // null/undefinedはスキップ
          try {
            // ここでpython_backend/translate.pyを呼び出し
            const pythonPath = path.resolve('python_backend/translate.py');
            const texts = JSON.stringify(file.texts || []);
            const sourceLang = file.sourceLang || 'ja';
            const targetLang = file.targetLang || 'en';
            const model = file.model || 'claude-3-haiku-20240307';
            const args = [
              pythonPath,
              '--texts', texts,
              '--source-lang', sourceLang,
              '--target-lang', targetLang,
              '--model', model,
            ];
            await new Promise<void>((resolve, reject) => {
              const proc = spawn('python3', args);
              let stdout = '';
              let stderr = '';
              proc.stdout.on('data', (data) => { stdout += data.toString(); });
              proc.stderr.on('data', (data) => { stderr += data.toString(); });
              proc.on('close', (code) => {
                if (code === 0) {
                  // 結果をファイルやDBに保存する場合はここで
                  // file.translations = ...
                  resolve();
                } else {
                  error = stderr || `Python exited with code ${code}`;
                  reject(new Error(error));
                }
              });
            });
            progress++;
            // 進捗をDBに反映
            await prisma.batchJob.update({ where: { id: job.id }, data: { progress } });
          } catch (e) {
            error = (e instanceof Error) ? e.message : String(e);
            break;
          }
        }
        // 完了/失敗ステータス
        await prisma.batchJob.update({
          where: { id: job.id },
          data: {
            status: error ? 'FAILED' : 'COMPLETED',
            error,
            progress,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        // ジョブ単位の致命的エラー
        await prisma.batchJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            error: (e instanceof Error) ? e.message : String(e),
            updatedAt: new Date(),
          },
        });
      }
    }
    // 5秒ごとにポーリング
    await new Promise((r) => setTimeout(r, 5000));
  }
}

processBatchJobs().catch((e) => {
  console.error('バッチワーカー致命的エラー:', e);
  process.exit(1);
}); 