import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { BatchJobStatus } from '@prisma/client';
import { withAPILogging } from '@/lib/utils/api-logging';
import { addBatchTranslationJob } from '@/lib/queue/queue-manager';

// ジョブ再試行API
async function handler(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // トークンからユーザー情報を取得
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const jobId = params.jobId;
    
    // ジョブ情報を取得
    const job = await prisma.BatchJob.findUnique({
      where: { 
        id: jobId,
        userId: token.sub // 自分のジョブのみ再試行可能
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: '指定されたジョブが見つかりません' },
        { status: 404 }
      );
    }

    // 処理中のジョブは再試行不可
    if (job.status === BatchJobStatus.PROCESSING || job.status === BatchJobStatus.PENDING) {
      return NextResponse.json(
        { error: '処理中のジョブは再試行できません' },
        { status: 400 }
      );
    }

    // 新しいジョブIDを生成
    const newJobId = await prisma.BatchJob.create({
      data: {
        userId: token.sub,
        status: BatchJobStatus.PENDING,
        totalFiles: job.totalFiles,
        processedFiles: 0,
        failedFiles: 0,
        options: job.options || {},
      }
    }).then(job => job.id);

    // 元のジョブの情報を取得して新しいジョブを作成
    // 実際のファイル情報は元のジョブの結果から取得する必要があります
    // ここでは簡略化のため、ダミーデータを使用
    const files = Array.from({ length: job.totalFiles }).map((_, index) => ({
      name: `file_${index}.pptx`,
      path: `/tmp/users/${token.sub}/files/file_${index}.pptx`,
    }));

    // 新しいジョブをキューに追加
    await addBatchTranslationJob(
      token.sub,
      newJobId,
      files,
      job.options || {}
    );

    // アクティビティログに記録
    await prisma.ActivityLog.create({
      data: {
        userId: token.sub,
        type: 'BATCH_JOB_RETRY',
        description: `バッチジョブ ${jobId} を再試行しました`,
        metadata: {
          originalJobId: jobId,
          newJobId,
          timestamp: new Date().toISOString(),
        },
      }
    });

    return NextResponse.json({
      message: 'ジョブを再試行します',
      newJobId,
    });
  } catch (error) {
    console.error('ジョブ再試行エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ログ機能付きハンドラーをエクスポート
export const POST = withAPILogging(handler, 'batch-job-retry');
