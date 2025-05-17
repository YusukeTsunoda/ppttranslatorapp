import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { BatchJobStatus } from '@prisma/client';
import { withAPILogging } from '@/lib/utils/api-logging';
import path from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

// ダウンロードリンク生成API
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
        userId: token.sub // 自分のジョブのみアクセス可能
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: '指定されたジョブが見つかりません' },
        { status: 404 }
      );
    }

    // 完了していないジョブはダウンロード不可
    if (job.status !== BatchJobStatus.COMPLETED) {
      return NextResponse.json(
        { error: '完了していないジョブはダウンロードできません' },
        { status: 400 }
      );
    }

    // ダウンロードURLを生成
    // 実際の実装では、ジョブの処理結果ファイルをZIPにまとめてダウンロードリンクを生成する
    // ここでは簡略化のため、ダミーのダウンロードURLを返す
    const downloadUrl = `/api/download/${token.sub}/${jobId}/batch-results.zip`;

    // アクティビティログに記録
    await prisma.ActivityLog.create({
      data: {
        userId: token.sub,
        type: 'BATCH_JOB_DOWNLOAD',
        description: `バッチジョブ ${jobId} の結果をダウンロードしました`,
        metadata: {
          jobId,
          timestamp: new Date().toISOString(),
        },
      }
    });

    return NextResponse.json({
      downloadUrl,
      message: 'ダウンロードリンクを生成しました',
    });
  } catch (error) {
    console.error('ダウンロードリンク生成エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ログ機能付きハンドラーをエクスポート
export const GET = withAPILogging(handler, 'batch-job-download');
