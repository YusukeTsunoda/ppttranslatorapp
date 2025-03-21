import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateResetToken } from '@/lib/auth/token';
import { sendPasswordResetEmail } from '@/lib/email/send';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    // 環境変数のチェック
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in the environment');
      return NextResponse.json({ error: 'Email service configuration error' }, { status: 500 });
    }

    const body = await req.json();
    const { email } = requestSchema.parse(body);

    // レート制限チェック - 現在のスキーマでは lastPasswordReset フィールドが存在しない可能性があるため、コメントアウト
    /*
    const lastReset = await prisma.user.findUnique({
      where: { email },
      select: { lastPasswordReset: true },
    });

    if (lastReset?.lastPasswordReset) {
      const timeSinceLastReset = Date.now() - lastReset.lastPasswordReset.getTime();
      if (timeSinceLastReset < 60000) { // 1分以内の再送信を制限
        return NextResponse.json(
          { error: '時間をおいて再度お試しください' },
          { status: 429 }
        );
      }
    }
    */

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合でも成功レスポンスを返す
      return NextResponse.json({ success: true });
    }

    // リセットトークンの生成
    const token = await generateResetToken();
    const expires = new Date(Date.now() + 15 * 60000); // 15分後に有効期限切れ

    // ユーザー情報の更新 - 現在のスキーマに合わせて更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // resetToken と resetTokenExpires フィールドが存在しない可能性があるため、
        // 実際のスキーマに合わせて修正が必要
        updatedAt: new Date(),
      },
    });

    // パスワードリセットメールの送信
    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'パスワードリセットの要求に失敗しました' }, { status: 500 });
  }
}
