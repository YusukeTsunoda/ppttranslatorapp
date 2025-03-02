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
      console.error('Unauthorized access attempt');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // パスパラメータを結合して画像パスを作成
    const imagePath = join(FILE_CONFIG.tempDir, session.user.id, 'slides', ...params.path);
    console.log('Debug - Image request:', {
      userId: session.user.id,
      pathParams: params.path,
      fullPath: imagePath,
      exists: existsSync(imagePath)
    });

    try {
      const imageBuffer = await readFile(imagePath);
      console.log('Debug - Image successfully read:', imagePath);
      
      // Content-Typeの設定
      const contentType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Error reading image file:', error);
      console.error('Attempted path:', imagePath);
      return new NextResponse('Image not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error in slide image API:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 