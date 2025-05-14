import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { withAPILogging } from '@/lib/utils/api-logging';

export const dynamic = 'force-dynamic';

// APIキーの使用状況取得
async function handler(req: NextRequest) {
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

    // 現在の月のアクティビティを取得
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScriptの月は0始まり
    const currentYear = currentDate.getFullYear();

    // APIキー関連のアクティビティを取得
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        userId: token.sub,
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1), // 今月の初日
          lt: new Date(currentYear, currentMonth, 1), // 来月の初日
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // 最新100件のみ取得
    });

    // アクティビティをフィルタリング（APIキーIDに関連するものだけ）
    const filteredLogs = activityLogs.filter(log => {
      const metadata = log.metadata as Record<string, any> || {};
      return metadata.apiKeyId === keyId;
    });

    // 使用状況のサマリーを計算
    const summary = {
      totalCalls: filteredLogs.length,
      apiCallsByEndpoint: {} as Record<string, number>,
      lastUsed: apiKey.lastUsed,
      status: apiKey.isRevoked 
        ? 'revoked' 
        : (apiKey.expiresAt && apiKey.expiresAt < new Date() ? 'expired' : 'active'),
    };

    // エンドポイント別の使用回数を集計
    filteredLogs.forEach(log => {
      // metadataがJSONオブジェクトであることを確認し、適切に型キャストする
      const metadata = log.metadata as Record<string, any> || {};
      const endpoint = metadata.endpoint as string || 'unknown';
      if (!summary.apiCallsByEndpoint[endpoint]) {
        summary.apiCallsByEndpoint[endpoint] = 0;
      }
      summary.apiCallsByEndpoint[endpoint]++;
    });

    return NextResponse.json({
      success: true,
      data: {
        key: {
          id: apiKey.id,
          name: apiKey.name,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt,
          permissions: apiKey.permissions,
        },
        usage: summary,
        recentActivity: filteredLogs.map(log => {
          const metadata = log.metadata as Record<string, any> || {};
          return {
            id: log.id,
            timestamp: log.createdAt,
            type: log.type,
            endpoint: metadata.endpoint || 'unknown',
            status: metadata.status || 'unknown',
          };
        }),
      },
    });
  } catch (error) {
    console.error('APIキー使用状況取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ログ機能を適用したハンドラをエクスポート
export const GET = withAPILogging(handler, 'api-keys-usage'); 

