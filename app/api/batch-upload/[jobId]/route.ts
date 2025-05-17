import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { BatchJobStatus } from '@prisma/client';
import { withAPILogging } from '@/lib/utils/api-logging';
import path from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import archiver from 'archiver';

// ジョブ詳細取得API
export async function GET(
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

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        failedFiles: job.failedFiles,
        options: job.options,
        results: job.results,
        errorDetails: job.errorDetails,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      }
    });
  } catch (error) {
    console.error('ジョブ詳細取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ジョブキャンセルAPI
export async function DELETE(
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
