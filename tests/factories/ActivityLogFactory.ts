import { PrismaClient, ActivityLog } from '@prisma/client';
import { BaseFactory } from './BaseFactory';
import { UserFactory } from './UserFactory';

/**
 * アクティビティログモデル作成時のデータ型
 */
type ActivityLogCreateInput = {
  id?: string;
  userId: string;
  type: string;
  description: string;
  metadata?: any;
};

/**
 * アクティビティログのタイプ
 */
export enum ActivityLogType {
  TRANSLATION = 'translation',
  LOGIN = 'login',
  SIGNUP = 'signup',
  CREDIT_PURCHASE = 'credit_purchase',
  CREDIT_USAGE = 'credit_usage',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  SETTINGS_UPDATE = 'settings_update',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
}

/**
 * アクティビティログモデルのテストデータを生成するファクトリークラス
 */
export class ActivityLogFactory extends BaseFactory<ActivityLog, ActivityLogCreateInput> {
  protected readonly model = 'activityLog';
  private userFactory: UserFactory;

  constructor() {
    super();
    this.userFactory = new UserFactory();
  }

  /**
   * デフォルトのアクティビティログデータを定義
   * @returns デフォルトのアクティビティログデータ
   */
  protected defineDefaults(): ActivityLogCreateInput {
    return {
      id: this.generateCuid(),
      userId: this.generateId(), // 実際のユーザーIDは create 時に設定
      type: ActivityLogType.TRANSLATION,
      description: 'Translated a document',
      metadata: {},
    };
  }

  /**
   * 指定したユーザーに紐づくアクティビティログを作成
   * @param userId ユーザーID
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたアクティビティログ
   */
  public async createForUser(
    userId: string,
    data: Partial<ActivityLogCreateInput> = {},
    tx?: PrismaClient
  ): Promise<ActivityLog> {
    return this.create({ ...data, userId }, tx);
  }

  /**
   * 新しいユーザーを作成し、そのユーザーに紐づくアクティビティログを作成
   * @param userData ユーザーデータ（オプション）
   * @param logData アクティビティログデータ（オプション）
   * @returns 作成されたアクティビティログとユーザー
   */
  public async createWithNewUser(
    userData = {},
    logData = {}
  ): Promise<{ log: ActivityLog; user: any }> {
    return this.withTransaction(async (factory, tx) => {
      const user = await this.userFactory.create(userData, tx);
      const log = await factory.createForUser(user.id, logData, tx);
      return { log, user };
    });
  }

  /**
   * 翻訳アクティビティログを作成
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたアクティビティログ
   */
  public async createTranslationLog(
    data: Partial<ActivityLogCreateInput> = {},
    tx?: PrismaClient
  ): Promise<ActivityLog> {
    return this.create({
      ...data,
      type: ActivityLogType.TRANSLATION,
      description: 'Translated a document',
      metadata: { ...data.metadata, fileId: this.generateId(), pageCount: this.generateRandomNumber(1, 20) },
    }, tx);
  }

  /**
   * ログインアクティビティログを作成
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたアクティビティログ
   */
  public async createLoginLog(
    data: Partial<ActivityLogCreateInput> = {},
    tx?: PrismaClient
  ): Promise<ActivityLog> {
    return this.create({
      ...data,
      type: ActivityLogType.LOGIN,
      description: 'User logged in',
      metadata: { ...data.metadata, ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
    }, tx);
  }

  /**
   * クレジット使用アクティビティログを作成
   * @param credits 使用したクレジット数
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたアクティビティログ
   */
  public async createCreditUsageLog(
    credits: number = 10,
    data: Partial<ActivityLogCreateInput> = {},
    tx?: PrismaClient
  ): Promise<ActivityLog> {
    return this.create({
      ...data,
      type: ActivityLogType.CREDIT_USAGE,
      description: `Used ${credits} credits`,
      metadata: { ...data.metadata, credits, purpose: 'translation' },
    }, tx);
  }

  /**
   * 指定したタイプのアクティビティログを作成
   * @param type アクティビティログタイプ
   * @param description 説明
   * @param metadata メタデータ
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたアクティビティログ
   */
  public async createWithType(
    type: ActivityLogType,
    description: string,
    metadata: any = {},
    data: Partial<ActivityLogCreateInput> = {},
    tx?: PrismaClient
  ): Promise<ActivityLog> {
    return this.create({
      ...data,
      type,
      description,
      metadata: { ...metadata, ...data.metadata },
    }, tx);
  }
}
