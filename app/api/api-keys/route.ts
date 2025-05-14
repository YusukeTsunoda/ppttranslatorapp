import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { randomBytes, createHash } from 'crypto';
import { withAPILogging } from '@/lib/utils/api-logging';

export const dynamic = 'force-dynamic';

// APIキーのリスト取得
async function getHandler(req: NextRequest) {
  try {
    // ユーザー認証
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // ユーザーのAPIキー一覧を取得
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: token.sub,
        isRevoked: false,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsed: true,
        expiresAt: true,
        permissions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    console.error('APIキー一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 新規APIキーの作成
async function postHandler(req: NextRequest) {
  try {
    // ユーザー認証
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await req.json();
    const { name, expiresInDays, permissions } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'APIキー名は必須です' },
        { status: 400 }
      );
    }

    // 既存のAPIキー数をチェック（上限は5）
    const keyCount = await prisma.apiKey.count({
      where: {
        userId: token.sub,
        isRevoked: false,
      },
    });

    if (keyCount >= 5) {
      return NextResponse.json(
        { error: 'APIキーの上限数（5）に達しています。不要なキーを削除してください。' },
        { status: 400 }
      );
    }

    // APIキーを生成
    const apiKeyValue = randomBytes(32).toString('hex');
    
    // 有効期限を設定（デフォルトは30日）
    const days = expiresInDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // データベースに保存
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: token.sub,
        name,
        key: apiKeyValue,
        expiresAt,
        permissions: permissions || { translate: true, history: true },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKeyValue,  // 作成時のみ完全なキーを返す
        expiresAt: apiKey.expiresAt,
        permissions: apiKey.permissions,
      },
    });
  } catch (error) {
    console.error('APIキー作成エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// APIキーの削除（論理削除）
async function deleteHandler(req: NextRequest) {
  try {
    // ユーザー認証
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // URLからkeyIdを取得
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'APIキーIDが指定されていません' },
        { status: 400 }
      );
    }

    // キーの存在確認とユーザー所有権チェック
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey || apiKey.userId !== token.sub) {
      return NextResponse.json(
        { error: '指定されたAPIキーが見つからないか、アクセス権限がありません' },
        { status: 404 }
      );
    }

    // キーを論理削除（isRevokedをtrueに設定）
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isRevoked: true },
    });

    return NextResponse.json({
      success: true,
      message: 'APIキーが無効化されました',
    });
  } catch (error) {
    console.error('APIキー削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ログ機能を適用したハンドラをエクスポート
export const GET = withAPILogging(getHandler, 'api-keys-list');
export const POST = withAPILogging(postHandler, 'api-keys-create');
export const DELETE = withAPILogging(deleteHandler, 'api-keys-delete'); 
