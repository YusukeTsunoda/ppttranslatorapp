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
      console.log('ファイル詳細確認:', {
        path,
        exists,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime
      });
      return { exists, stats };
    }
    
    console.log('ファイルが存在しません:', { path });
    return { exists, stats: null };
  } catch (error) {
    console.error('ファイル詳細確認エラー:', {
      path,
      error: error instanceof Error ? error.message : String(error)
    });
    return { exists: false, stats: null, error };
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  console.log('スライドAPI - リクエスト受信:', {
    url: request.url,
    params: params.path,
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method
  });
  try {
    // パスパラメータからファイルIDと画像名を取得
    if (!params.path || params.path.length < 2) {
      return NextResponse.json(
        { error: '無効なパスパラメータ' },
        { status: 400 }
      );
    }

    const fileId = params.path[0];
    // 新形式のパス構造のみをサポート
    // /api/slides/{fileId}/slides/{imageName} 形式
    if (params.path.length < 3 || params.path[1] !== 'slides') {
      return NextResponse.json(
        { error: '無効なパス形式。/api/slides/{fileId}/slides/{imageName}の形式を使用してください。' },
        { status: 400 }
      );
    }
    
    const imageName = params.path[2];

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
    
    console.log('スライドAPI - セッション情報:', {
      hasSession: !!session,
      userId: session?.user?.id,
      isAuthenticated: !!session?.user?.id,
      isDevelopment: process.env.NODE_ENV === 'development'
    });

    // 開発環境では認証をバイパスする処理
    if (process.env.NODE_ENV === 'development' && !session) {
      // 開発環境でのみ、すべてのユーザーディレクトリを検索
      const uploadsDir = join(FILE_CONFIG.tempDir, 'users');
      
      if (existsSync(uploadsDir)) {
        const userDirs = readdirSync(uploadsDir).filter(dir => 
          existsSync(join(uploadsDir, dir)) && 
          statSync(join(uploadsDir, dir)).isDirectory()
        );
        
        for (const userDir of userDirs) {
          // 新形式のパス構造のみを使用
          const possiblePath = join(uploadsDir, userDir, fileId, 'slides', imageName);
          
          console.log('スライドAPI - 検索パス:', {
            possiblePath,
            exists: existsSync(possiblePath),
            userDir,
            fileId,
            imageName,
            fullPath: params.path.join('/')
          });
          
          if (existsSync(possiblePath)) {
            try {
              const imageBuffer = await readFile(possiblePath);
              const stats = statSync(possiblePath);
              
              console.log('スライドAPI - 開発環境でファイル発見:', {
                path: possiblePath,
                size: stats.size,
                userDir,
                fileId,
                imageName
              });
              
              // 画像のMIMEタイプを判定
              const contentType = imageName.endsWith('.png') 
                ? 'image/png' 
                : imageName.endsWith('.jpg') || imageName.endsWith('.jpeg')
                ? 'image/jpeg'
                : 'application/octet-stream';
              
              console.log('スライドAPI - 画像返却:', {
                path: possiblePath,
                size: stats.size,
                contentType,
                userDir,
                fileId,
                imageName
              });
              
              return new NextResponse(imageBuffer, {
                headers: {
                  'Content-Type': contentType,
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'Access-Control-Allow-Credentials': 'true',
                },
              });
            } catch (error) {
              console.error('スライドAPI - ファイル読み込みエラー:', {
                path: possiblePath,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        }
        
        return NextResponse.json(
          { error: 'ファイルが見つかりません' },
          { status: 404 }
        );
      }
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
    const imagePath = join(FILE_CONFIG.tempDir, 'users', userId, fileId, 'slides', imageName);

    console.log('スライドAPI - 認証済みユーザーのファイルパス:', {
      imagePath,
      exists: existsSync(imagePath),
      userId,
      fileId,
      imageName,
      tempDir: FILE_CONFIG.tempDir,
      fullPath: params.path.join('/')
    });

    // ファイルの存在確認
    const { exists, stats } = await checkFileDetails(imagePath);

    if (!exists) {
      // 代替パスは試さない - 新形式のみをサポート
      return NextResponse.json(
        { error: 'ファイルが見つかりません', path: imagePath, fileId, imageName },
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

      console.log('スライドAPI - 画像返却:', {
        path: imagePath,
        size: stats?.size,
        contentType,
        userId,
        fileId,
        imageName
      });

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
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
  console.log('スライドAPI - OPTIONSリクエスト:', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method
  });
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
