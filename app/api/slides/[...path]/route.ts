import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync, statSync, readdirSync } from 'fs';
import { FILE_CONFIG } from '@/lib/utils/file-utils';

// スライド画像のファイル詳細を確認する関数
async function checkFileDetails(path: string) {
  try {
    const exists = existsSync(path);
    
    if (exists) {
      const stats = statSync(path);
      return { exists, stats };
    }
    
    return { exists, stats: null };
  } catch (error) {
    return { exists: false, stats: null, error };
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // パスパラメータからファイルIDと画像名を取得
    if (!params.path || params.path.length < 2) {
      return NextResponse.json(
        { error: '無効なパスパラメータ' },
        { status: 400 }
      );
    }

    const fileId = params.path[0];
    // パスの長さに応じて画像名を取得
    let imageName;
    if (params.path.length > 2 && params.path[1] === 'slides') {
      // /api/slides/{fileId}/slides/{imageName} 形式
      imageName = params.path[2];
    } else {
      // /api/slides/{fileId}/{imageName} 形式
      imageName = params.path[1];
    }

    // パスパラメータの詳細をログ出力
    console.log('スライドAPI - パスパラメータ:', {
      path: params.path,
      fileId,
      imageName,
      fullPath: params.path.join('/'),
      pathLength: params.path.length
    });

    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);

    // 開発環境では認証をバイパスする処理
    if (process.env.NODE_ENV === 'development' && !session) {
      // 開発環境でのみ、すべてのユーザーディレクトリを検索
      const uploadsDir = join(FILE_CONFIG.tempDir);
      
      if (existsSync(uploadsDir)) {
        const userDirs = readdirSync(uploadsDir).filter(dir => 
          existsSync(join(uploadsDir, dir)) && 
          statSync(join(uploadsDir, dir)).isDirectory()
        );
        
        for (const userDir of userDirs) {
          // パスの構築方法を修正 - 新形式のパス構造のみを使用
          const possiblePath = join(uploadsDir, userDir, fileId, 'slides', imageName);
          
          console.log('スライドAPI - 検索パス:', {
            possiblePath,
            exists: existsSync(possiblePath),
            userDir
          });
          
          if (existsSync(possiblePath)) {
            try {
              const imageBuffer = await readFile(possiblePath);
              
              // 画像のMIMEタイプを判定
              const contentType = imageName.endsWith('.png') 
                ? 'image/png' 
                : imageName.endsWith('.jpg') || imageName.endsWith('.jpeg')
                ? 'image/jpeg'
                : 'application/octet-stream';
              
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
              // ファイル読み込みエラー
              return NextResponse.json(
                { error: 'ファイル読み込みエラー' },
                { status: 500 }
              );
            }
          }
        }
      }
      
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // 認証チェック
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // ユーザーIDを取得
    const userId = session.user.id;

    // 画像ファイルのパスを構築
    // 新形式のパス構造のみを使用
    const imagePath = join(FILE_CONFIG.tempDir, userId, fileId, 'slides', imageName);

    console.log('スライドAPI - 認証済みユーザーのファイルパス:', {
      imagePath,
      exists: existsSync(imagePath),
      userId,
      fileId,
      imageName
    });

    // ファイルの存在確認
    const { exists, stats } = await checkFileDetails(imagePath);

    if (!exists) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    try {
      // ファイルを読み込む
      const imageBuffer = await readFile(imagePath);

      // 画像のMIMEタイプを判定
      const contentType = imageName.endsWith('.png') 
        ? 'image/png' 
        : imageName.endsWith('.jpg') || imageName.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream';

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
      // ファイル読み込みエラー
      return NextResponse.json(
        { error: 'ファイル読み込みエラー' },
        { status: 500 }
      );
    }
  } catch (error) {
    // 予期しないエラー
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
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
