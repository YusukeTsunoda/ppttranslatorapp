// Node.jsランタイムを明示的に指定
// PPTXパーサーの処理を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { StreamingPPTXParser } from '@/lib/pptx/streaming-parser';
import { auth } from '@/lib/auth/auth';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

// アップロードされるファイルの最大サイズ（20MB）
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 許可するファイルタイプ
const ALLOWED_FILE_TYPES = ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];

// バッファをストリームに変換する関数
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable._read = () => {}; // _read メソッドを実装する必要がある
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export async function POST(req: NextRequest) {
  let tempDir: string | undefined;

  try {
    // 処理開始時間を記録
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] PPTXパース処理開始`);
    
    // 認証チェック
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'ログインしてください' }, { status: 401 });
    }

    // ファイルの取得
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // バリデーション
    if (!file) {
      return NextResponse.json({ success: false, error: 'ファイルが指定されていません' }, { status: 400 });
    }

    // ファイルタイプのチェック
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'PPTXファイルのみアップロード可能です' }, { status: 400 });
    }

    // ファイルサイズのチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'ファイルサイズは20MB以下にしてください' }, { status: 400 });
    }

    console.log(`[${new Date().toISOString()}] ファイルサイズ: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // 一時ディレクトリの作成
    tempDir = path.join(process.cwd(), 'tmp', uuidv4());
    await fs.mkdir(tempDir, { recursive: true });

    // ファイルをバッファに変換
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // バッファをストリームに変換
    const fileStream = bufferToStream(buffer);

    // ストリーミングPPTXパーサーのインスタンスを取得
    const parser = StreamingPPTXParser.getInstance();

    // ストリームからファイルを解析
    console.log(`[${new Date().toISOString()}] ストリーミングパーサーによる解析開始`);
    const result = await parser.parsePPTXStream(fileStream, tempDir);
    console.log(`[${new Date().toISOString()}] ストリーミングパーサーによる解析完了`);

    // 処理時間を計算
    const processingTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] PPTXパース処理完了: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`);

    // 結果を返す
    return NextResponse.json({
      ...result,
      processingTime,
      processingTimeSeconds: processingTime / 1000
    });
  } catch (error) {
    console.error('PPTXファイルの処理中にエラーが発生しました:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      },
      { status: 500 },
    );
  } finally {
    // 一時ディレクトリの削除
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true });
      } catch (error) {
        console.error('一時ディレクトリの削除に失敗しました:', error);
      }
    }
    
    // 明示的にガベージコレクションを促す
    if (global.gc) {
      global.gc();
    }
  }
}

// GET リクエストは許可しない
export async function GET() {
  return NextResponse.json({ success: false, error: 'メソッドが許可されていません' }, { status: 405 });
}
