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

    // トークンの検証
    const user = await prisma.users.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'トークンが無効か有効期限が切れています' },
        { status: 400 }
      );
    }

    // パスワードのハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザー情報の更新
    await prisma.users.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
        updatedAt: new Date(),
      },
    });

    // アクティビティログの記録
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { error: 'パスワードのリセットに失敗しました' },
      { status: 500 }
    );
  }
} 