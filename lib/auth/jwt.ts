import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub: string;
  email: string | null;
  role: string;
}

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

export function verifyJwtAccessToken(token: string) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}
