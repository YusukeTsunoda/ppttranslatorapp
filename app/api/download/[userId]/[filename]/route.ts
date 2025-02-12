import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { verifyToken } from "@/lib/auth/session";

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

    // ファイルパスの構築
    const filePath = join(
      process.cwd(),
      'tmp',
      'users',
      params.userId,
      'uploads',
      params.filename
    );

    // ファイルの存在確認
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('File not found:', filePath);
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }

    // ファイルの読み込み
    const fileBuffer = await fs.readFile(filePath);

    // レスポンスヘッダーの設定
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    headers.set('Content-Disposition', `attachment; filename="${params.filename}"`);

    // ファイルをレスポンスとして返す
    return new NextResponse(fileBuffer, {
      headers,
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: "ファイルのダウンロードに失敗しました" },
      { status: 500 }
    );
  }
} 