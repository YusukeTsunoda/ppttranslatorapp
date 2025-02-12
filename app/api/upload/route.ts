import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // セッションチェック
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
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
    const filePath = join(tempDir, `${session.user.id}_${Date.now()}.pptx`);

    // ディレクトリが存在しない場合は作成
    await writeFile(filePath, buffer);

    // Pythonスクリプトの実行
    const pythonScript = join(process.cwd(), "lib/python/pptx_parser.py");
    const { stdout, stderr } = await execAsync(`python ${pythonScript} ${filePath}`);

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
      slides: slideData,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "ファイルのアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
