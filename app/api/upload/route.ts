// Node.jsランタイムを明示的に指定
// ファイルシステム操作とchild_processを含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync, readdirSync } from 'fs';
import {
  generateFileId,
  createUserDirectories,
  cleanupOldFiles,
  filePathManager,
  logFileOperation,
} from '@/lib/utils/file-utils';
// JavaScriptのパーサーを削除
// import { parsePptx } from '@/lib/utils/pptx-parser';
// Pythonのパーサーを使用
import { PPTXParser } from '@/lib/pptx/parser';
import { getToken } from 'next-auth/jwt';
import { parseForm, uploadFilesToUserDir, processFiles } from '@/lib/utils/upload-helpers';
import { PrismaClient } from '@prisma/client';
import { withAPILogging } from '@/lib/utils/api-logging';
import { fileFilterSchema, errorMessages } from '@/lib/utils/query-filter';
import { buildFileQuery, formatPaginatedResponse } from '@/lib/utils/query-builder';

// ファイルサイズ制限
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// 許可するファイルタイプ
const ALLOWED_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];

// Prismaクライアントの初期化
const prisma = new PrismaClient();

// ファイル一覧取得ハンドラ
export async function GET(req: NextRequest) {
  try {
    // ユーザー認証
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: errorMessages.unauthorized }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    
    // クエリパラメータのパースとバリデーション
    const parseResult = fileFilterSchema.safeParse(
      Object.fromEntries(url.searchParams.entries())
    );
    
    // バリデーションエラーがある場合はエラーレスポンスを返す
    if (!parseResult.success) {
      const errors = parseResult.error.format();
      return NextResponse.json({ 
        error: 'クエリパラメータが無効です', 
        details: errors 
      }, { status: 400 });
    }
    
    // 検証済みのパラメータを取得
    const filterParams = parseResult.data;
    
    // Prismaクエリを構築
    const { where, orderBy, pagination } = buildFileQuery(filterParams, userId);
    
    // クエリの実行とデータ取得をトランザクションで実行
    const [totalCount, files] = await prisma.$transaction([
      prisma.file.count({ where }),
      prisma.file.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          Slide: {
            select: {
              _count: true
            }
          },
          TranslationHistory: {
            select: {
              id: true,
              status: true,
              sourceLang: true,
              targetLang: true,
              creditsUsed: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1 // 最新の翻訳履歴のみを取得
          }
        },
      }),
    ]);
    
    // レスポンス形式の加工
    const enhancedFiles = files.map(file => ({
      ...file,
      slideCount: file.Slide.length > 0 ? file.Slide.length : 0,
      latestTranslation: file.TranslationHistory.length > 0 ? file.TranslationHistory[0] : null,
      // 不要なネストデータを削除
      Slide: undefined,
      TranslationHistory: undefined
    }));
    
    // 標準形式でレスポンスを返す
    return NextResponse.json(
      formatPaginatedResponse(
        enhancedFiles, 
        totalCount, 
        filterParams.page, 
        filterParams.limit
      )
    );
  } catch (error) {
    console.error('ファイル一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'ファイル一覧の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// アップロードハンドラ
async function uploadHandler(req: NextRequest) {
  try {
    // ユーザー認証
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // formidableでファイルをパース
    const userId = token.sub;
    const [fields, files] = await uploadFilesToUserDir(req as any, userId);
    
    // アップロードされたファイルの情報を取得
    const uploadedFiles = processFiles(files);
    
    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'ファイルがアップロードされていません' },
        { status: 400 }
      );
    }

    // ファイル情報をデータベースに保存
    const savedFiles = await Promise.all(
      uploadedFiles.map(file => 
        prisma.file.create({
          data: {
            id: file.hash || crypto.randomUUID(),
            userId,
            originalName: file.originalFilename,
            storagePath: file.filepath,
            fileSize: file.size,
            mimeType: file.mimetype,
            updatedAt: new Date(),
          }
        })
      )
    );

    // アクティビティログに記録
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'FILE_UPLOAD',
        description: `${uploadedFiles.length}個のファイルをアップロードしました`,
        metadata: {
          fileCount: uploadedFiles.length,
          fileIds: savedFiles.map(f => f.id),
        }
      }
    });

    return NextResponse.json({
      success: true,
      files: savedFiles.map(file => ({
        id: file.id,
        originalName: file.originalName,
        size: file.fileSize,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
      }))
    });
  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    return NextResponse.json(
      { error: 'ファイルアップロード中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// formidableのAPIは通常のリクエスト形式でのみ動作します
export const POST = withAPILogging(uploadHandler, 'file-upload');
