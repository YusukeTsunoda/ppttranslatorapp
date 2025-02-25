// Node.jsランタイムを明示的に指定
// ファイルシステム操作を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { verifyToken } from "@/lib/auth/session";
import { filePathManager, logFileOperation, withRetry } from '@/lib/utils/file-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; filename: string } }
) {
  try {
    // セッションチェック
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const session = await verifyToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // セッションのユーザーIDとパラメータのユーザーIDが一致するか確認
    if (session.user.id.toString() !== params.userId) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    // ファイル名からファイルIDを抽出
    const fileIdMatch = params.filename.match(/^([^_]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : params.filename;

    // ファイルタイプの判定（translated か original か）
    const isTranslated = params.filename.includes('_translated');
    const fileType = isTranslated ? 'translated' : 'original';

    // ファイルパスの構築 - 実際のファイルを検索
    let filePath: string = '';
    let fileExists = false;

    // ファイルを検索
    const actualFilePath = await filePathManager.findActualFilePath(params.userId, fileId, fileType as 'translated' | 'original');
    if (actualFilePath) {
      filePath = actualFilePath;
      fileExists = true;
      console.log(`File found: ${filePath}`);
    } else {
      console.error('File not found for:', {
        userId: params.userId,
        filename: params.filename,
        fileId,
        fileType
      });
    }

    // ファイルが見つからない場合
    if (!fileExists) {
      console.error('File not found in any location for:', {
        userId: params.userId,
        filename: params.filename,
        fileId,
        fileType
      });
      return NextResponse.json({ 
        error: "ファイルが見つかりません",
        details: "指定されたファイルが見つかりませんでした。再度アップロードしてください。"
      }, { status: 404 });
    }

    // ファイルの読み込みとログ記録
    try {
      const fileBuffer = await fs.readFile(filePath);
      await logFileOperation(params.userId, 'access', fileId, true);
      
      // レスポンスヘッダーの設定
      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      headers.set('Content-Disposition', `attachment; filename="${params.filename}"`);

      // ファイルをレスポンスとして返す
      return new NextResponse(fileBuffer, {
        headers,
      });
    } catch (readError) {
      console.error('Error reading file:', readError);
      if (readError instanceof Error) {
        await logFileOperation(params.userId, 'access', fileId, false, readError.message);
      }
      throw readError;
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { 
        error: "ファイルのダウンロードに失敗しました",
        details: error instanceof Error ? error.message : "不明なエラーが発生しました"
      },
      { status: 500 }
    );
  }
} 