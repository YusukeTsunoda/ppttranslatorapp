import { hashPassword, comparePasswords } from '@/lib/auth/password';

describe('パスワード関連ユーティリティ', () => {
  describe('hashPassword', () => {
    it('パスワードをハッシュ化できる', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      // ハッシュ化されたパスワードは元のパスワードと異なるはず
      expect(hashedPassword).not.toBe(password);
      
      // ハッシュ化されたパスワードはbcryptの形式に従っているはず
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/);
    });
    
    it('同じパスワードでも異なるハッシュを生成する', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // 同じパスワードでもソルトが異なるため、ハッシュも異なる
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('comparePasswords', () => {
    it('正しいパスワードを検証できる', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await comparePasswords(password, hashedPassword);
      expect(isValid).toBe(true);
    });
    
    it('誤ったパスワードを検出できる', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await comparePasswords(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
    
    it('空のパスワードを検証できる', async () => {
      const password = '';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await comparePasswords(password, hashedPassword);
      expect(isValid).toBe(true);
    });
  });
});
