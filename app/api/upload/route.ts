import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { verifyToken } from "@/lib/auth/session";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // セッションチェック
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    try {
      const session = await verifyToken(sessionCookie.value);
      if (!session) {
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: "認証が無効です" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    // ファイル形式チェック
    if (!file.name.endsWith(".pptx")) {
      return NextResponse.json(
        { error: "PPTXファイルのみ対応しています" },
        { status: 400 }
      );
    }

    // 一時ファイルパスの生成
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempDir = join(process.cwd(), "tmp");
    
    // tmpディレクトリが存在しない場合は作成
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }

    const filePath = join(tempDir, `${Date.now()}_${file.name}`);

    // ファイルの保存
    await writeFile(filePath, buffer);

    // Pythonスクリプトの実行
    const pythonScript = join(process.cwd(), "lib/python/pptx_parser.py");
    const { stdout, stderr } = await execAsync(`python3 ${pythonScript} ${filePath}`);

    if (stderr) {
      console.error("Python script error:", stderr);
      return NextResponse.json(
        { error: "ファイルの解析に失敗しました" },
        { status: 500 }
      );
    }

    // 解析結果をJSONとしてパース
    const slideData = JSON.parse(stdout);

    return NextResponse.json({
      success: true,
      filePath: filePath,
      slides: slideData.slides,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "ファイルのアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
