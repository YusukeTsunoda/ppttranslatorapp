import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { BatchJobStatus } from '@prisma/client';
import { withAPILogging } from '@/lib/utils/api-logging';

// ジョブキャンセルAPI
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
        userId: token.sub // 自分のジョブのみキャンセル可能
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: '指定されたジョブが見つかりません' },
        { status: 404 }
      );
    }

    // 完了済みのジョブはキャンセル不可
    if (job.status === BatchJobStatus.COMPLETED || job.status === BatchJobStatus.FAILED) {
      return NextResponse.json(
        { error: '完了済みまたは失敗したジョブはキャンセルできません' },
        { status: 400 }
      );
    }

    // ジョブをキャンセル状態に更新
    await prisma.BatchJob.update({
      where: { id: jobId },
      data: {
        status: BatchJobStatus.CANCELLED,
        completedAt: new Date(),
      }
    });

    // アクティビティログに記録
    await prisma.ActivityLog.create({
      data: {
        userId: token.sub,
        type: 'BATCH_JOB_CANCELLED',
        description: `バッチジョブ ${jobId} をキャンセルしました`,
        metadata: {
          jobId,
          timestamp: new Date().toISOString(),
        },
      }
    });

    return NextResponse.json({
      message: 'ジョブをキャンセルしました',
    });
  } catch (error) {
    console.error('ジョブキャンセルエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ログ機能付きハンドラーをエクスポート
export const POST = withAPILogging(handler, 'batch-job-cancel');
