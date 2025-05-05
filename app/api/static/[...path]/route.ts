import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * 静的ファイルを提供するAPIルート
 * 主にスライド画像などの一時ファイルへのアクセスに使用
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // パスパラメータを結合して画像パスを作成
    const pathParts = params.path;
    if (pathParts.length < 1) {
      return new NextResponse('Invalid path', { status: 400 });
    }

    // パスの先頭に「tmp」が含まれている場合は保持する
    // 例: /api/static/tmp/users/... -> tmp/users/...
    let adjustedParts = [...pathParts];
    
    console.log('Debug - Static file request - Initial:', {
      pathParams: pathParts,
      adjustedParts
    });

    // tmpディレクトリ内のファイルへのアクセスを許可
    const filePath = join(process.cwd(), ...adjustedParts);
    
    console.log('Debug - Static file request:', {
      pathParams: pathParts,
      adjustedParts,
      fullPath: filePath,
      exists: existsSync(filePath)
    });

    // セキュリティチェック: tmpディレクトリ外へのアクセスを防止
    const normalizedPath = path.normalize(filePath);
    const tmpDir = path.normalize(join(process.cwd(), 'tmp'));
    
    if (!normalizedPath.startsWith(tmpDir)) {
      console.error('Security violation: Attempted path traversal', {
        requestedPath: filePath,
        normalizedPath,
        tmpDir
      });
      return new NextResponse('Forbidden', { status: 403 });
    }

    try {
      const fileBuffer = await readFile(filePath);
      console.log('Debug - File successfully read:', filePath);
      
      // Content-Typeの設定
      let contentType = 'application/octet-stream';
      if (filePath.toLowerCase().endsWith('.png')) {
        contentType = 'image/png';
      } else if (filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (filePath.toLowerCase().endsWith('.pdf')) {
        contentType = 'application/pdf';
      }
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Error reading file:', error);
      console.error('Attempted path:', filePath);
      return new NextResponse('File not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error in static file API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
