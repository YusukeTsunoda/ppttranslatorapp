// Node.jsランタイムを明示的に指定
// ファイルシステム操作とchild_processを含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync } from "fs";
import { 
  generateFileId, 
  createUserDirectories, 
  cleanupOldFiles,
  filePathManager,
  logFileOperation
} from '@/lib/utils/file-utils';
import { parsePptx } from '@/lib/utils/pptx-parser';

// ファイルサイズ制限
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// 許可するファイルタイプ
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

export async function POST(request: NextRequest) {
  let fileId: string | null = null;
  let userId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    userId = session.user.id;
    fileId = generateFileId();

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

    // ファイルサイズの検証
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは20MB以下にしてください" },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
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
      await logFileOperation(userId, 'create', fileId, false, 'ディレクトリの作成に失敗しました');
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
      await logFileOperation(userId, 'create', fileId, true);
    } catch (error) {
      console.error("Error saving file:", error);
      await logFileOperation(userId, 'create', fileId, false, 'ファイルの保存に失敗しました');
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
    
    try {
      // Node.jsベースのPPTX解析処理を使用
      const slideData = await parsePptx(filePath, slidesDir);

      if ('error' in slideData) {
        console.error("PPTX parsing error:", slideData.error);
        await logFileOperation(userId, 'access', fileId, false, slideData.error);
        return NextResponse.json(
          { error: slideData.error },
          { status: 500 }
        );
      }

      if (!slideData.slides || !Array.isArray(slideData.slides)) {
        await logFileOperation(userId, 'access', fileId, false, 'スライドデータの形式が不正です');
        return NextResponse.json(
          { error: "スライドデータの形式が不正です" },
          { status: 500 }
        );
      }

      const slidesWithFileId = slideData.slides.map((slide: any) => ({
        ...slide,
        fileId,
        filePath: filePath,
        image_path: `${fileId}/slide_${slide.index + 1}.png`
      }));

      console.log('Debug - Generated slides data:', {
        fileId,
        slidesDir,
        slidesCount: slidesWithFileId.length,
        samplePath: slidesWithFileId[0]?.image_path,
        fullPath: join(slidesDir, `slide_1.png`)
      });

      await logFileOperation(userId, 'access', fileId, true);
      return NextResponse.json({
        success: true,
        filePath: filePath,
        slides: slidesWithFileId,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      await logFileOperation(userId, 'access', fileId, false, 'ファイルの処理に失敗しました');
      return NextResponse.json(
        { error: "ファイルの処理に失敗しました" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    if (userId && fileId) {
      await logFileOperation(userId, 'create', fileId, false, 'ファイルのアップロードに失敗しました');
    }
    return NextResponse.json(
      { error: "ファイルのアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
