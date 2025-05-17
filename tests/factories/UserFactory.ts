import { PrismaClient, User, UserRole } from '@prisma/client';
import { BaseFactory } from './BaseFactory';

/**
 * ユーザーモデル作成時のデータ型
 */
type UserCreateInput = {
  id: string;
  email: string;
  name?: string;
  password?: string;
  role: UserRole;
  credits: number;
  emailVerified?: Date | null;
  image?: string | null;
};

/**
 * ユーザーモデルのテストデータを生成するファクトリークラス
 */
export class UserFactory extends BaseFactory<User, UserCreateInput> {
  protected readonly model = 'user';

  /**
   * デフォルトのユーザーデータを定義
   * @returns デフォルトのユーザーデータ
   */
  protected defineDefaults(): UserCreateInput {
    return {
      id: this.generateId(),
      email: this.generateEmail(),
      name: this.generateRandomString('User'),
      role: 'USER',
      credits: 0,
      emailVerified: null,
      image: null,
    };
  }

  /**
   * 管理者ユーザーを作成
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成された管理者ユーザー
   */
  public async createAdmin(data: Partial<UserCreateInput> = {}, tx?: PrismaClient): Promise<User> {
    return this.create({ ...data, role: 'ADMIN' }, tx);
  }

  /**
   * クレジットを持つユーザーを作成
   * @param credits クレジット数
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたユーザー
   */
  public async createWithCredits(credits: number, data: Partial<UserCreateInput> = {}, tx?: PrismaClient): Promise<User> {
    return this.create({ ...data, credits }, tx);
  }

  /**
   * 検証済みメールアドレスを持つユーザーを作成
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたユーザー
   */
  public async createVerified(data: Partial<UserCreateInput> = {}, tx?: PrismaClient): Promise<User> {
    return this.create({ ...data, emailVerified: this.getPastDate() }, tx);
  }
}
