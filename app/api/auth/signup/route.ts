import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import crypto from 'crypto';

// スキーマ定義
const userSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上必要です'),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 環境変数をログ出力
  console.log('==== DATABASE CONNECTION DEBUG INFO ====');
  console.log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

  if (process.env.DATABASE_URL) {
    console.log(`DATABASE_URL prefix: ${process.env.DATABASE_URL.substring(0, 15)}...`);
    console.log(
      `DATABASE_URL starts with postgresql:// or postgres://: ${
        process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')
      }`,
    );

    // 引用符の有無を確認
    console.log(
      `DATABASE_URL contains quotes: ${
        process.env.DATABASE_URL.includes('"') || process.env.DATABASE_URL.includes("'")
      }`,
    );

    // 完全なURLを出力（パスワードをマスク）
    try {
      const urlObj = new URL(process.env.DATABASE_URL);
      const maskedUrl = `${urlObj.protocol}//${urlObj.username}:****@${urlObj.host}${urlObj.pathname}${urlObj.search}`;
      console.log(`Masked DATABASE_URL: ${maskedUrl}`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : '不明なエラー';
      console.log(`Error parsing DATABASE_URL: ${errorMessage}`);
    }
  } else {
    console.log('DATABASE_URL is not set');
  }

  console.log('=======================================');

  try {
    const body = await request.json();

    // バリデーション
    const validationResult = userSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password } = validationResult.data;

    const prisma = new PrismaClient();

    // ユーザーの存在確認
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      await prisma.$disconnect();
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 });
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(), // UUIDを生成
        name,
        email,
        password: hashedPassword,
        credits: 15, // 初期クレジットを15に設定
        updatedAt: new Date(), // 現在の日時
      },
    });

    await prisma.$disconnect();

    return NextResponse.json(
      {
        message: 'ユーザーが正常に作成されました',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
