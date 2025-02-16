// Node.jsランタイムを明示的に指定
// ファイルシステム操作とchild_processを含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { generateFileId, createUserDirectories, cleanupOldFiles } from '@/lib/utils/file-utils';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // セッションチェックを新しい方式に変更
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // userIdを取得
    const userId = session.user.id;
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
    
    console.log('File saved:', {
      filePath,
      fileId,
      fileName,
      uploadDir
    });

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
      const slidesWithFileId = slideData.slides.map((slide: any) => ({
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
