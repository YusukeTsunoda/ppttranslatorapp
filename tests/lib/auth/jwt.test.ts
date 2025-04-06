import { signJwtAccessToken, verifyJwtAccessToken, isTokenExpired, getUserIdFromToken } from '@/lib/auth/jwt';
import jwt from 'jsonwebtoken';

// テスト用の環境変数をモック
const originalEnv = process.env;

describe('JWT認証ユーティリティ', () => {
  beforeEach(() => {
    // 各テスト前に環境変数をモック
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  });

  afterEach(() => {
    // テスト後に環境変数を元に戻す
    process.env = originalEnv;
  });

  describe('signJwtAccessToken', () => {
    it('有効なペイロードからJWTトークンを生成できる', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };

      const token = signJwtAccessToken(payload);
      
      // トークンが文字列であることを確認
      expect(typeof token).toBe('string');
      // JWTの形式（xxx.yyy.zzz）に従っていることを確認
      expect(token.split('.')).toHaveLength(3);
    });

    it('emailがnullの場合でもトークンを生成できる', () => {
      const payload = {
        sub: 'user-123',
        email: null,
        role: 'user'
      };

      const token = signJwtAccessToken(payload);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('JWT_SECRETが未定義の場合はエラーをスローする', () => {
      // JWT_SECRETを削除
      delete process.env.JWT_SECRET;

      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };

      expect(() => signJwtAccessToken(payload)).toThrow('JWT_SECRET is not defined');
    });
  });

  describe('verifyJwtAccessToken', () => {
    it('有効なトークンを検証できる', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };

      const token = signJwtAccessToken(payload);
      const decoded = verifyJwtAccessToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it('無効なトークンの場合はnullを返す', () => {
      const invalidToken = 'invalid.token.format';
      
      const decoded = verifyJwtAccessToken(invalidToken);
      expect(decoded).toBeNull();
    });

    it('JWT_SECRETが未定義の場合はnullを返す', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };

      const token = signJwtAccessToken(payload);
      
      // JWT_SECRETを削除
      delete process.env.JWT_SECRET;
      
      const decoded = verifyJwtAccessToken(token);
      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('有効期限内のトークンはfalseを返す', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      // 有効期限を1時間後に設定
      const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
      
      expect(isTokenExpired(token)).toBe(false);
    });
    
    it('有効期限切れのトークンはtrueを返す', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      // 有効期限を過去に設定（-1秒）
      const token = jwt.sign(payload, 'test-secret', { expiresIn: '-1s' });
      
      expect(isTokenExpired(token)).toBe(true);
    });
    
    it('無効なトークンはtrueを返す', () => {
      const invalidToken = 'invalid.token.format';
      
      expect(isTokenExpired(invalidToken)).toBe(true);
    });
    
    it('expクレームがないトークンはtrueを返す', () => {
      // expクレームなしでトークンを生成
      const payload = {
        sub: 'user-123',
        email: 'test@example.com'
      };
      
      const token = jwt.sign(payload, 'test-secret');
      
      expect(isTokenExpired(token)).toBe(true);
    });
  });
  
  describe('getUserIdFromToken', () => {
    it('有効なトークンからユーザーIDを抽出できる', () => {
      const userId = 'user-123';
      const payload = {
        sub: userId,
        email: 'test@example.com',
        role: 'user'
      };
      
      const token = jwt.sign(payload, 'test-secret');
      
      expect(getUserIdFromToken(token)).toBe(userId);
    });
    
    it('subクレームがないトークンはnullを返す', () => {
      // subクレームなしでトークンを生成
      const payload = {
        email: 'test@example.com',
        role: 'user'
      };
      
      const token = jwt.sign(payload, 'test-secret');
      
      expect(getUserIdFromToken(token)).toBeNull();
    });
    
    it('無効なトークンはnullを返す', () => {
      const invalidToken = 'invalid.token.format';
      
      expect(getUserIdFromToken(invalidToken)).toBeNull();
    });
  });
});
