import jwt, { JwtPayload } from 'jsonwebtoken';

interface TokenPayload {
  sub: string;
  email: string | null;
  role: string;
}

/**
 * JWTアクセストークンを生成する
 * @param payload トークンに含めるペイロード
 * @returns 生成されたJWTトークン
 */
export function signJwtAccessToken(payload: TokenPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  // emailがnullの場合は空文字列に変換
  const safePayload = {
    ...payload,
    email: payload.email || '',
  };

  const token = jwt.sign(safePayload, secret, {
    expiresIn: '1d', // 1日で有効期限切れ
  });

  return token;
}

/**
 * JWTアクセストークンを検証する
 * @param token 検証するトークン
 * @returns 検証結果（成功時はペイロード、失敗時はnull）
 */
export function verifyJwtAccessToken(token: string) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // テスト環境ではエラーログを出力しない
      if (process.env.NODE_ENV !== 'test') {
        console.error('JWT verification error: JWT_SECRET is not defined');
      }
      return null;
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    // テスト環境ではエラーログを出力しない
    if (process.env.NODE_ENV !== 'test') {
      console.error('JWT verification error:', error);
    }
    return null;
  }
}

/**
 * トークンの有効期限を確認する
 * @param token 確認するトークン
 * @returns 有効期限内ならtrue、期限切れならfalse
 */
export function isTokenExpired(token: string): boolean {
  try {
    // jwt.decodeの戻り値の型を適切に処理
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      return true;
    }

    // payload.expが存在するか確認
    const payload = decoded.payload;
    if (typeof payload !== 'object' || payload === null || !('exp' in payload)) {
      return true;
    }

    const expirationTime = (payload.exp as number) * 1000; // JWTの有効期限はUNIX時間（秒）
    const currentTime = Date.now();
    
    return currentTime >= expirationTime;
  } catch (error) {
    // トークンのデコードに失敗した場合は期限切れとみなす
    return true;
  }
}

/**
 * トークンからユーザーIDを抽出する
 * @param token JWTトークン
 * @returns ユーザーID（subクレーム）、取得できない場合はnull
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    
    // subプロパティが存在するか確認
    if (!('sub' in decoded) || typeof decoded.sub !== 'string') {
      return null;
    }
    
    return decoded.sub;
  } catch (error) {
    return null;
  }
}
