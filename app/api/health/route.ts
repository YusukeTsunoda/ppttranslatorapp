import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyJwtAccessToken, isTokenExpired } from '@/lib/auth/jwt';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { headers } from 'next/headers';

// Node.jsランタイムを使用（Prismaクライアントの要件）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 環境変数のヘルスチェック
const checkEnvironmentVariables = () => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'STRIPE_SECRET_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    status: missingVars.length === 0 ? 'ok' : 'warning',
    missing: missingVars.length > 0 ? missingVars : undefined,
  };
};

// データベース接続のヘルスチェック
const checkDatabaseConnection = async () => {
  const prisma = new PrismaClient();
  
  try {
    // 簡単なクエリを実行してデータベース接続を確認
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    return {
      status: 'ok',
      latency: 'normal',
    };
  } catch (error) {
    console.error('データベース接続エラー:', error);
    
    try {
      await prisma.$disconnect();
    } catch (e) {
      // 切断エラーは無視
    }
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '不明なデータベースエラー',
    };
  }
};

// 認証機能のヘルスチェック
const checkAuthSystem = () => {
  try {
    // JWTシークレットの存在確認
    if (!process.env.JWT_SECRET) {
      return {
        status: 'error',
        message: 'JWT_SECRET is not defined',
      };
    }
    
    // テスト用のトークンを生成して検証
    const testPayload = {
      sub: 'health-check-user',
      email: 'health@example.com',
      role: 'system',
    };
    
    // JWT機能のテスト
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '5m' });
    
    const decoded = verifyJwtAccessToken(token);
    const tokenExpired = isTokenExpired(token);
    
    if (!decoded || tokenExpired) {
      return {
        status: 'error',
        message: 'JWT検証に失敗しました',
      };
    }
    
    return {
      status: 'ok',
    };
  } catch (error) {
    console.error('認証システムエラー:', error);
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '不明な認証エラー',
    };
  }
};

// エラーハンドリングのヘルスチェック
const checkErrorHandling = () => {
  try {
    // エラーメッセージの取得テスト
    const testErrorMessage = getAuthErrorMessage('AuthenticationError');
    
    if (!testErrorMessage) {
      return {
        status: 'warning',
        message: 'エラーメッセージの取得に失敗しました',
      };
    }
    
    return {
      status: 'ok',
    };
  } catch (error) {
    console.error('エラーハンドリングシステムエラー:', error);
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '不明なエラー',
    };
  }
};

export async function GET(request: Request) {
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  // URLからクエリパラメータを取得
  const url = new URL(request.url);
  const skipDb = url.searchParams.get('skip_db') === 'true';
  
  // 各コンポーネントのヘルスチェックを実行
  const envCheck = checkEnvironmentVariables();
  
  // データベース接続チェックは、skip_db=trueの場合はスキップ
  const dbCheck = skipDb 
    ? { status: 'skipped', message: 'Database check was skipped' }
    : await checkDatabaseConnection();
    
  const authCheck = checkAuthSystem();
  const errorHandlingCheck = checkErrorHandling();
  
  // 全体のステータスを判定（スキップされたデータベースチェックは考慮しない）
  const overallStatus = 
    (envCheck.status === 'error' || 
    (!skipDb && dbCheck.status === 'error') || 
    authCheck.status === 'error' || 
    errorHandlingCheck.status === 'error')
      ? 'error' 
      : (envCheck.status === 'warning' || 
        (!skipDb && dbCheck.status === 'warning') || 
        authCheck.status === 'warning' || 
        errorHandlingCheck.status === 'warning')
        ? 'warning'
        : 'ok';
  
  // 本番環境では詳細情報を制限
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    components: {
      environment: isProduction 
        ? { status: envCheck.status } 
        : envCheck,
      database: dbCheck,
      auth: authCheck,
      errorHandling: errorHandlingCheck,
    },
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
  };
  
  // エラーがある場合は適切なHTTPステータスコードを返す
  // データベースチェックがスキップされた場合は、他のコンポーネントのステータスに基づいてHTTPステータスを決定
  const httpStatus = overallStatus === 'error' ? 500 : overallStatus === 'warning' ? 299 : 200;
  
  return NextResponse.json(response, { status: httpStatus });
}
