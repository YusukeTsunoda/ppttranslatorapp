import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { verifyToken } from "@/lib/auth/session";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// ファイル名を生成する関数
const generateFileId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${random}`;
};

// ユーザーのディレクトリを作成する関数
const createUserDirectories = async (userId: string, fileId: string) => {
  const baseDir = join(process.cwd(), "tmp", "users", userId);
  const uploadDir = join(baseDir, "uploads");
  const slidesDir = join(baseDir, "slides", fileId);

  await mkdir(uploadDir, { recursive: true });
  await mkdir(slidesDir, { recursive: true });

  return { uploadDir, slidesDir };
};

// 古いファイルを削除する関数（24時間以上経過したファイル）
const cleanupOldFiles = async (userId: string) => {
  const baseDir = join(process.cwd(), "tmp", "users", userId);
  if (!existsSync(baseDir)) return;

  const { stdout } = await execAsync(`find "${baseDir}" -type f -mtime +1 -delete`);
};

export async function POST(request: NextRequest) {
  try {
    // セッションチェック
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    let session;
    try {
      session = await verifyToken(sessionCookie.value);
      if (!session) {
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: "認証が無効です" }, { status: 401 });
    }

    // userIdを文字列に変換
    const userId = session.user.id.toString();
    const fileId = generateFileId();

    // 古いファイルの削除を実行
    await cleanupOldFiles(userId);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    if (!file.name.endsWith(".pptx")) {
      return NextResponse.json(
        { error: "PPTXファイルのみ対応しています" },
        { status: 400 }
      );
    }

    // ユーザーのディレクトリを作成
    const { uploadDir, slidesDir } = await createUserDirectories(userId, fileId);

    // ファイル名を生成
    const fileName = `${fileId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = join(uploadDir, fileName);

    // ファイルを保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Pythonスクリプトの実行
    const pythonScript = join(process.cwd(), "lib/python/pptx_parser.py");
    console.log('Executing Python script with file path:', filePath);
    
    const { stdout, stderr } = await execAsync(`python3 "${pythonScript}" "${filePath}" "${slidesDir}"`);

    try {
      const slideData = JSON.parse(stdout);
      
      if (stderr) {
        console.log("Python script debug info:", stderr);
      }

      if (slideData.error) {
        console.error("Python script error:", slideData.error);
        return NextResponse.json(
          { error: slideData.error },
          { status: 500 }
        );
      }

      if (!slideData.slides || !Array.isArray(slideData.slides)) {
        return NextResponse.json(
          { error: "スライドデータの形式が不正です" },
          { status: 500 }
        );
      }

      // スライドデータにfileIdを追加
      const slidesWithFileId = slideData.slides.map(slide => ({
        ...slide,
        fileId,
        image_path: `${fileId}/${slide.image_path}`
      }));

      return NextResponse.json({
        success: true,
        filePath: filePath,
        slides: slidesWithFileId,
      });
    } catch (error) {
      console.error("JSON parse error:", error);
      console.error("stdout:", stdout);
      console.error("stderr:", stderr);
      return NextResponse.json(
        { error: "解析結果の処理に失敗しました" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "ファイルのアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
