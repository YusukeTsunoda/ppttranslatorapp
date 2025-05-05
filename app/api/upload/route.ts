// Node.jsランタイムを明示的に指定
// ファイルシステム操作とchild_processを含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync } from 'fs';
import {
  generateFileId,
  createUserDirectories,
  cleanupOldFiles,
  filePathManager,
  logFileOperation,
} from '@/lib/utils/file-utils';
// JavaScriptのパーサーを削除
// import { parsePptx } from '@/lib/utils/pptx-parser';
// Pythonのパーサーを使用
import { PPTXParser } from '@/lib/pptx/parser';

// ファイルサイズ制限
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// 許可するファイルタイプ
const ALLOWED_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];

export async function POST(request: NextRequest) {
  let fileId: string | null = null;
  let userId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    userId = session.user.id;
    fileId = generateFileId();

    try {
      await cleanupOldFiles(userId);
    } catch (error) {
      // エラーがあっても続行
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
    }

    // ファイルサイズの検証
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'ファイルサイズは20MB以下にしてください' }, { status: 400 });
    }

    // ファイルタイプの検証
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'PPTXファイルのみ対応しています' }, { status: 400 });
    }

    let uploadDir: string;
    let slidesDir: string;

    try {
      const dirs = await createUserDirectories(userId, fileId);
      uploadDir = dirs.uploadDir;
      slidesDir = dirs.slidesDir;
    } catch (error) {
      await logFileOperation(userId, 'create', fileId, false, 'ディレクトリの作成に失敗しました');
      return NextResponse.json({ error: 'ディレクトリの作成に失敗しました' }, { status: 500 });
    }

    const fileName = `${fileId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = join(uploadDir, fileName);

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      await logFileOperation(userId, 'create', fileId, true);
    } catch (error) {
      await logFileOperation(userId, 'create', fileId, false, 'ファイルの保存に失敗しました');
      return NextResponse.json({ error: 'ファイルの保存に失敗しました' }, { status: 500 });
    }

    try {
      // Pythonベースのパーサーを使用
      const parser = PPTXParser.getInstance();
      
      try {
        const slideData = await parser.parsePPTX(filePath, slidesDir);

        // スライドデータが正常に処理されているか検証
        if (!slideData || !slideData.slides || !Array.isArray(slideData.slides) || slideData.slides.length === 0) {
          await logFileOperation(userId, 'access', fileId, false, 'スライドデータの形式が不正です');
          return NextResponse.json({ error: 'スライドデータの形式が不正です' }, { status: 500 });
        }

        // スライドイメージファイルの存在確認
        const firstSlideImagePath = join(slidesDir, 'slide_1.png');
        const imageExists = existsSync(firstSlideImagePath);

        if (!imageExists) {
          await logFileOperation(userId, 'access', fileId, false, 'スライド画像の生成に失敗しました');
          return NextResponse.json({ error: 'スライド画像の生成に失敗しました' }, { status: 500 });
        }

        // スライドデータを正規化して文章情報を強化
        const normalizedSlides = slideData.slides.map((slide: any, index: number) => {
          // テキスト要素を正規化
          const texts = Array.isArray(slide.textElements) 
            ? slide.textElements
                .filter((text: any) => {
                  // 空のテキスト要素を除外
                  if (typeof text === 'string') {
                    return text.trim().length > 0;
                  }
                  if (typeof text === 'object') {
                    const content = text.content || text.text || '';
                    return content.trim().length > 0;
                  }
                  return false;
                })
                .map((text: any) => {
                  // テキスト要素の構造を標準化
                  if (typeof text === 'string') {
                    return {
                      text: text.trim(),
                      position: { x: 0, y: 0, width: 0, height: 0 },
                    };
                  }

                  // オブジェクト形式のテキスト要素を処理
                  if (!text || typeof text !== 'object') {
                    return null;
                  }

                  // テキスト内容を取得
                  const content = (text.content || text.text || '').trim();

                  // 位置情報を取得
                  const position =
                    text.position && typeof text.position === 'object'
                      ? {
                          x: typeof text.position.x === 'number' ? text.position.x : 0,
                          y: typeof text.position.y === 'number' ? text.position.y : 0,
                          width: typeof text.position.width === 'number' ? text.position.width : 0,
                          height: typeof text.position.height === 'number' ? text.position.height : 0,
                        }
                      : { x: 0, y: 0, width: 0, height: 0 };

                  return {
                    text: content,
                    position,
                  };
                })
                .filter(Boolean) // nullをフィルタリング
            : Array.isArray(slide.texts) 
              ? slide.texts.filter((text: any) => {
                  if (typeof text === 'object' && text.text) {
                    return text.text.trim().length > 0;
                  }
                  return false;
                })
              : [];

          // 画像パスを構築
          const imagePath = slide.imagePath || slide.image_path || `slide_${index + 1}.png`;
          // スライドの画像URLを構築（相対パスで）
          // 注意: ここではfileIdとimagePathの間にslidesディレクトリを含める
          const imageUrl = `/api/slides/${fileId}/slides/${imagePath}`;

          return {
            index: slide.index || index,
            texts,
            imageUrl, // imageUrlプロパティを追加
            translations: slide.translations || [],
          };
        });

        await logFileOperation(userId, 'access', fileId, true);
        
        // レスポンスデータをログ出力
        console.log('アップロードAPIレスポンス:', {
          success: true,
          fileId: fileId,
          slidesCount: normalizedSlides.length,
          firstSlideImageUrl: normalizedSlides[0]?.imageUrl,
          firstSlideTexts: normalizedSlides[0]?.texts?.length,
          slides: normalizedSlides // ログにもスライドデータを含める
        });
        
        return NextResponse.json({
          success: true,
          fileId: fileId,
          slides: normalizedSlides,
        });
      } catch (error: any) {
        console.error(`PPTX処理エラー: ${error.message}`);
        
        // エラー詳細をログに記録
        await logFileOperation(userId, 'access', fileId, false, `PPTX処理エラー: ${error.message}`);
        
        return NextResponse.json({ 
          error: 'PPTXファイルの処理中にエラーが発生しました',
          details: error.message 
        }, { status: 500 });
      }
    } catch (error) {
      if (userId && fileId) {
        await logFileOperation(userId, 'create', fileId, false, 'ファイルのアップロードに失敗しました');
      }
      return NextResponse.json({ error: 'ファイルのアップロードに失敗しました' }, { status: 500 });
    }
  } catch (error) {
    if (userId && fileId) {
      await logFileOperation(userId, 'create', fileId, false, 'ファイルのアップロードに失敗しました');
    }
    return NextResponse.json({ error: 'ファイルのアップロードに失敗しました' }, { status: 500 });
  }
}
