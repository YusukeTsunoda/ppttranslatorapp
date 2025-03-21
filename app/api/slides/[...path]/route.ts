import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync } from 'fs';
import { FILE_CONFIG } from '@/lib/utils/file-utils';

// デバッグ用にファイルの存在確認と詳細情報を出力する関数
async function checkFileDetails(path: string) {
  try {
    const exists = existsSync(path);
    console.log(`File check: ${path} - exists: ${exists}`);

    if (exists) {
      const stats = await require('fs/promises').stat(path);
      console.log(`File stats: size=${stats.size}, created=${stats.birthtime}, modified=${stats.mtime}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error checking file details: ${path}`, error);
    return false;
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    console.log('=== Slide Image Request ===');
    console.log('Request URL:', request.url);
    console.log('Path params:', params.path);

    // パスパラメータの検証
    if (!params.path || params.path.length < 2) {
      console.error('Invalid path parameters:', params.path);
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid path parameters',
          details: 'Path should contain fileId and imageName',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        },
      );
    }

    const fileId = params.path[0];
    const imageName = params.path[1];

    console.log(`Requested file: fileId=${fileId}, imageName=${imageName}`);

    const session = await getServerSession(authOptions);
    console.log('Session user:', session?.user?.id || 'No session');

    // 認証チェック（開発環境ではバイパス可能）
    if (!session?.user?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: attempting to bypass authentication');

        // ユーザーディレクトリを探索
        const userDirs = existsSync(FILE_CONFIG.tempDir) ? require('fs').readdirSync(FILE_CONFIG.tempDir) : [];

        console.log(`Found user directories: ${userDirs.length}`);

        for (const userId of userDirs) {
          const possiblePath = join(FILE_CONFIG.tempDir, userId, 'slides', ...params.path);
          console.log(`Checking path: ${possiblePath}`);

          if (await checkFileDetails(possiblePath)) {
            try {
              console.log(`Found file at: ${possiblePath}, attempting to serve`);
              const imageBuffer = await readFile(possiblePath);
              const contentType = possiblePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

              console.log(`Successfully read file: ${possiblePath}, size=${imageBuffer.length} bytes`);

              return new NextResponse(imageBuffer, {
                headers: {
                  'Content-Type': contentType,
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
              });
            } catch (e) {
              console.error(`Error reading file: ${possiblePath}`, e);
              // エラーは無視して次のパスを試す
            }
          }
        }

        console.log('No matching file found in any user directory');
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Unauthorized',
          details: 'Authentication required',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        },
      );
    }

    // パスパラメータを結合して画像パスを作成
    const imagePath = join(FILE_CONFIG.tempDir, session.user.id, 'slides', ...params.path);
    console.log(`Authenticated request: userId=${session.user.id}, imagePath=${imagePath}`);

    try {
      // ファイルパスのデバッグ情報
      const fileExists = await checkFileDetails(imagePath);

      if (!fileExists) {
        console.error(`File not found: ${imagePath}`);
        return new NextResponse(
          JSON.stringify({
            error: 'Image not found',
            path: imagePath,
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          },
        );
      }

      const imageBuffer = await readFile(imagePath);

      // Content-Typeの設定
      const contentType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

      console.log(`Successfully served image: ${imagePath}, size=${imageBuffer.length} bytes`);
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error) {
      console.error('Failed to read image file:', imagePath, error);
      // 詳細なエラーメッセージを返す
      return new NextResponse(
        JSON.stringify({
          error: 'Image not found',
          path: imagePath,
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        },
      );
    }
  } catch (error) {
    console.error('Error in slide image API:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  }
}

// OPTIONSリクエストに対応するためのハンドラを追加
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
