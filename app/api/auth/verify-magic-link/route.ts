import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { signJwtAccessToken } from '@/lib/auth/jwt';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

const requestSchema = z.object({
  token: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = requestSchema.parse(body);

    // トークンの検証
    const user = await prisma.user.findFirst({
      where: {
        magicLinkToken: token,
        magicLinkExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // メールアドレスがnullの場合はエラーを返す
    if (!user.email) {
      return NextResponse.json(
        { error: 'User email is missing' },
        { status: 400 }
      );
    }

    // トークンを無効化
    await prisma.user.update({
      where: { id: user.id },
      data: {
        magicLinkToken: null,
        magicLinkExpires: null,
        lastLogin: new Date(),
      },
    });

    // JWTトークンの生成
    const accessToken = signJwtAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify magic link' },
      { status: 500 }
    );
  }
} 