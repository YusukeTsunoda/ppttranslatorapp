import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync } from 'fs';
import { FILE_CONFIG } from '@/lib/utils/file-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // 開発環境では一時的に認証をバイパスして画像を表示できるようにする
      // 注意: 本番環境では必ず認証を有効にすること
      if (process.env.NODE_ENV === 'development') {
        // URLからユーザーIDを取得する試み
        const pathParts = params.path;
        if (pathParts.length >= 2) {
          const fileId = pathParts[0]; // 最初の部分はファイルID
          const slideFile = pathParts[1]; // 2番目の部分はスライドファイル名
          
          // ユーザーディレクトリを探索
          const userDirs = existsSync(FILE_CONFIG.tempDir) ? 
            require('fs').readdirSync(FILE_CONFIG.tempDir) : [];
          
          for (const userId of userDirs) {
            const possiblePath = join(FILE_CONFIG.tempDir, userId, 'slides', ...params.path);
            
            if (existsSync(possiblePath)) {
              try {
                const imageBuffer = await readFile(possiblePath);
                const contentType = possiblePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                return new NextResponse(imageBuffer, {
                  headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=3600',
                  },
                });
              } catch (e) {
                // エラーは無視して次のパスを試す
              }
            }
          }
        }
      }
      
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // パスパラメータを結合して画像パスを作成
    const imagePath = join(FILE_CONFIG.tempDir, session.user.id, 'slides', ...params.path);

    try {
      const imageBuffer = await readFile(imagePath);
      
      // Content-Typeの設定
      const contentType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      return new NextResponse('Image not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error in slide image API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 