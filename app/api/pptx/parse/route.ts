import { NextRequest, NextResponse } from 'next/server';
import { PPTXParser } from '@/lib/pptx/parser';
import { auth } from '@/lib/auth/auth';

// アップロードされるファイルの最大サイズ（20MB）
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 許可するファイルタイプ
const ALLOWED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'ログインしてください' },
        { status: 401 }
      );
    }

    // ファイルの取得
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // バリデーション
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルタイプのチェック
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'PPTXファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルサイズのチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'ファイルサイズは20MB以下にしてください' },
        { status: 400 }
      );
    }

    // ファイルをバッファーに変換
    const buffer = Buffer.from(await file.arrayBuffer());

    // PPTXパーサーのインスタンスを取得
    const parser = PPTXParser.getInstance();

    // ファイルを解析
    const result = await parser.parsePPTX(buffer);

    // 結果を返す
    return NextResponse.json(result);

  } catch (error) {
    console.error('PPTXファイルの処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました' 
      },
      { status: 500 }
    );
  }
}

// GET リクエストは許可しない
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'メソッドが許可されていません' },
    { status: 405 }
  );
}
