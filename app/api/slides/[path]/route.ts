import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { verifyToken } from "@/lib/auth/session";

// パスの検証関数
const validatePath = (path: string): boolean => {
  // パスに '..' が含まれていないことを確認（ディレクトリトラバーサル対策）
  if (path.includes('..')) return false;
  
  // パスの形式を検証（例：fileId/slide_1.png）
  const pathPattern = /^[\w-]+\/slide_\d+\.png$/;
  if (!pathPattern.test(path)) return false;
  
  return true;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string } }
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

    // パスの検証
    if (!validatePath(params.path)) {
      return NextResponse.json({ error: "無効なファイルパスです" }, { status: 400 });
    }

    // userIdを文字列に変換
    const userId = session.user.id.toString();
    const userSlidesDir = join(process.cwd(), "tmp", "users", userId, "slides");
    const filePath = join(userSlidesDir, params.path);

    // ファイルの存在確認
    try {
      await stat(filePath);
    } catch (error) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }

    // ストリームを作成
    const stream = createReadStream(filePath);

    // レスポンスを返す
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving slide image:", error);
    return NextResponse.json(
      { error: "スライド画像の取得に失敗しました" },
      { status: 500 }
    );
  }
} 