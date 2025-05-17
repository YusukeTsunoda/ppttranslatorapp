import { PrismaClient, File, FileStatus } from '@prisma/client';
import { BaseFactory } from './BaseFactory';
import { UserFactory } from './UserFactory';

/**
 * ファイルモデル作成時のデータ型
 */
type FileCreateInput = {
  id: string;
  userId: string;
  originalName: string;
  storagePath: string;
  status: FileStatus;
  fileSize: number;
  mimeType: string;
};

/**
 * ファイルモデルのテストデータを生成するファクトリークラス
 */
export class FileFactory extends BaseFactory<File, FileCreateInput> {
  protected readonly model = 'file';
  private userFactory: UserFactory;

  constructor() {
    super();
    this.userFactory = new UserFactory();
  }

  /**
   * デフォルトのファイルデータを定義
   * @returns デフォルトのファイルデータ
   */
  protected defineDefaults(): FileCreateInput {
    const fileId = this.generateId();
    return {
      id: fileId,
      userId: this.generateId(), // 実際のユーザーIDは create 時に設定
      originalName: `presentation_${this.generateRandomString()}.pptx`,
      storagePath: `/tmp/users/test-user/${fileId}/slides`,
      status: 'READY',
      fileSize: this.generateRandomNumber(100000, 5000000), // 100KB〜5MB
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
  }

  /**
   * 指定したユーザーIDに紐づくファイルを作成
   * @param userId ユーザーID
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたファイル
   */
  public async createForUser(userId: string, data: Partial<FileCreateInput> = {}, tx?: PrismaClient): Promise<File> {
    return this.create({ ...data, userId }, tx);
  }

  /**
   * 新しいユーザーを作成し、そのユーザーに紐づくファイルを作成
   * @param userData ユーザーデータ（オプション）
   * @param fileData ファイルデータ（オプション）
   * @returns 作成されたファイルとユーザー
   */
  public async createWithNewUser(userData = {}, fileData = {}): Promise<{ file: File; user: any }> {
    return this.withTransaction(async (factory, tx) => {
      const user = await this.userFactory.create(userData, tx);
      const file = await factory.createForUser(user.id, fileData, tx);
      return { file, user };
    });
  }

  /**
   * 処理中ステータスのファイルを作成
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたファイル
   */
  public async createProcessing(data: Partial<FileCreateInput> = {}, tx?: PrismaClient): Promise<File> {
    return this.create({ ...data, status: 'PROCESSING' }, tx);
  }

  /**
   * エラーステータスのファイルを作成
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたファイル
   */
  public async createWithError(data: Partial<FileCreateInput> = {}, tx?: PrismaClient): Promise<File> {
    return this.create({ ...data, status: 'ERROR' }, tx);
  }
}
