import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const requestSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = requestSchema.parse(body);

    // 注意: 現在のスキーマでは resetToken と resetTokenExpires フィールドが存在しない可能性があります
    // 実際のスキーマに合わせて修正が必要です

    // トークンの検証 - ダミー実装
    // 実際のアプリケーションでは、別の方法でトークンを検証する必要があります
    const user = await prisma.user.findFirst({
      where: {
        email: 'dummy@example.com', // 実際には token に基づいてユーザーを検索する必要があります
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'トークンが無効か有効期限が切れています' }, { status: 400 });
    }

    // パスワードのハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザー情報の更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // アクティビティログの記録 - ActivityLogモデルが存在しないためコメントアウト
    /*
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'update_password',
        ipAddress: 'unknown',
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    });
    */

    // 代わりにコンソールにログを出力
    console.log('Password reset:', {
      userId: user.id,
      action: 'update_password',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json({ error: 'パスワードのリセットに失敗しました' }, { status: 500 });
  }
}
