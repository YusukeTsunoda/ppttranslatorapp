import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateMagicLinkToken } from '@/lib/auth/token';
import { sendMagicLinkEmail } from '@/lib/email/send';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    // 環境変数のチェック
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in the environment');
      return NextResponse.json(
        { error: 'Email service configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email } = requestSchema.parse(body);

    // レート制限チェック
    const lastSent = await prisma.user.findUnique({
      where: { email },
      select: { lastMagicLinkSent: true },
    });

    if (lastSent?.lastMagicLinkSent) {
      const timeSinceLastSent = Date.now() - lastSent.lastMagicLinkSent.getTime();
      if (timeSinceLastSent < 60000) { // 1分以内の再送信を制限
        return NextResponse.json(
          { error: 'Too many requests. Please wait before requesting another link.' },
          { status: 429 }
        );
      }
    }

    // トークン生成
    const token = await generateMagicLinkToken();
    const expires = new Date(Date.now() + 15 * 60000); // 15分後に有効期限切れ

    // ユーザー作成または更新
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        magicLinkToken: token,
        magicLinkExpires: expires,
        lastMagicLinkSent: new Date(),
      },
      create: {
        email,
        magicLinkToken: token,
        magicLinkExpires: expires,
        lastMagicLinkSent: new Date(),
      },
    });

    // メール送信
    await sendMagicLinkEmail(email, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Magic link request error:', error);
    return NextResponse.json(
      { error: 'Failed to process magic link request' },
      { status: 500 }
    );
  }
} 