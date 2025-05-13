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

// ファイルサイズ制限
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// 許可するファイルタイプ
const ALLOWED_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];

// Prismaクライアントの初期化
const prisma = new PrismaClient();

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
