// Node.jsランタイムを明示的に指定
// ファイルシステム操作とchild_processを含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { generateFileId, createUserDirectories, cleanupOldFiles } from '@/lib/utils/file-utils';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const fileId = generateFileId();

    try {
      await cleanupOldFiles(userId);
    } catch (error) {
      console.error("Error cleaning up old files:", error);
      // エラーがあっても続行
    }

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

    let uploadDir: string;
    let slidesDir: string;

    try {
      const dirs = await createUserDirectories(userId, fileId);
      uploadDir = dirs.uploadDir;
      slidesDir = dirs.slidesDir;
    } catch (error) {
      console.error("Error creating directories:", error);
      return NextResponse.json(
        { error: "ディレクトリの作成に失敗しました" },
        { status: 500 }
      );
    }

    const fileName = `${fileId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = join(uploadDir, fileName);

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
    } catch (error) {
      console.error("Error saving file:", error);
      return NextResponse.json(
        { error: "ファイルの保存に失敗しました" },
        { status: 500 }
      );
    }

    console.log('File saved:', {
      filePath,
      fileId,
      fileName,
      uploadDir
    });

    const pythonScript = join(process.cwd(), "lib/python/pptx_parser.py");
    
    try {
      const { stdout, stderr } = await execAsync(`python3 "${pythonScript}" "${filePath}" "${slidesDir}"`);
      
      if (stderr) {
        console.log("Python script debug info:", stderr);
      }

      const slideData = JSON.parse(stdout);

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

      const slidesWithFileId = slideData.slides.map((slide: any) => ({
        ...slide,
        fileId,
        image_path: `${fileId}/slide_${slide.index + 1}.png`
      }));

      console.log('Debug - Generated slides data:', {
        fileId,
        slidesDir,
        slidesCount: slidesWithFileId.length,
        samplePath: slidesWithFileId[0]?.image_path,
        fullPath: join(slidesDir, `slide_${slideData.slides[0].index + 1}.png`)
      });

      return NextResponse.json({
        success: true,
        filePath: filePath,
        slides: slidesWithFileId,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      return NextResponse.json(
        { error: "ファイルの処理に失敗しました" },
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
