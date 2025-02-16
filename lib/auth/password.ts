import { compare, hash } from 'bcryptjs';

// Node.jsランタイムを明示的に指定
export const config = {
  runtime: 'nodejs'
};

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  try {
    return await hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('パスワードのハッシュ化に失敗しました');
  }
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await compare(plainTextPassword, hashedPassword);
  } catch (error) {
    console.error('Password comparison error:', error);
    throw new Error('パスワードの比較に失敗しました');
  }
} 