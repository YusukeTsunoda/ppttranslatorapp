import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import path from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import { withAPILogging } from '@/lib/utils/api-logging';

export const dynamic = 'force-dynamic';

// バッチアップロード処理ハンドラ
async function handler(req: NextRequest) {
  try {
    // トークンからユーザー情報を取得
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // バッチジョブの登録
    const { files, options } = await req.json();
    
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // バッチジョブ作成
    const batchJob = await prisma.batchJob.create({
      data: {
        userId: token.sub,
        status: 'PENDING',
        totalFiles: files.length,
        processedFiles: 0,
        options: options || {},
      }
    });

    // バッチワーカーの起動指示（実際のワーカー処理はサーバーサイドで実行）
    // ここではジョブキューに登録するだけ
    console.log(`[Batch] ジョブ登録: ${batchJob.id}, ファイル数: ${files.length}`);

    return NextResponse.json({
      jobId: batchJob.id,
      message: 'バッチジョブが登録されました',
      estimatedTime: files.length * 2, // ファイル1つあたり約2分と仮定
    });
  } catch (error) {
    console.error('バッチアップロードエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ジョブステータス取得API
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'ジョブIDが指定されていません' },
        { status: 400 }
      );
    }

    const job = await prisma.batchJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { error: '指定されたジョブが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.totalFiles > 0 
        ? Math.round((job.processedFiles / job.totalFiles) * 100)
        : 0,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error('ジョブステータス取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// バッチジョブ登録ハンドラー（ログ機能付き）
export const POST = withAPILogging(handler, 'batch-upload'); 