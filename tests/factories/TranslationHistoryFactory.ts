import { PrismaClient, TranslationHistory, Language, TranslationStatus } from '@prisma/client';
import { BaseFactory } from './BaseFactory';
import { UserFactory } from './UserFactory';
import { FileFactory } from './FileFactory';

/**
 * 翻訳履歴モデル作成時のデータ型
 */
type TranslationHistoryCreateInput = {
  id?: string;
  userId: string;
  fileId: string;
  creditsUsed: number;
  sourceLang: Language;
  targetLang: Language;
  model: string;
  pageCount: number;
  fileSize: number;
  processingTime: number;
  status: TranslationStatus;
  metadata?: any;
  thumbnailPath?: string | null;
  translatedFileKey?: string | null;
  errorMessage?: string | null;
};

/**
 * 翻訳履歴モデルのテストデータを生成するファクトリークラス
 */
export class TranslationHistoryFactory extends BaseFactory<TranslationHistory, TranslationHistoryCreateInput> {
  protected readonly model = 'translationHistory';
  private userFactory: UserFactory;
  private fileFactory: FileFactory;

  constructor() {
    super();
    this.userFactory = new UserFactory();
    this.fileFactory = new FileFactory();
  }

  /**
   * デフォルトの翻訳履歴データを定義
   * @returns デフォルトの翻訳履歴データ
   */
  protected defineDefaults(): TranslationHistoryCreateInput {
    return {
      id: this.generateCuid(),
      userId: this.generateId(), // 実際のユーザーIDは create 時に設定
      fileId: this.generateId(), // 実際のファイルIDは create 時に設定
      creditsUsed: this.generateRandomNumber(10, 100),
      sourceLang: 'ja',
      targetLang: 'en',
      model: 'claude-3-sonnet-20241022',
      pageCount: this.generateRandomNumber(1, 20),
      fileSize: this.generateRandomNumber(100000, 5000000), // 100KB〜5MB
      processingTime: this.generateRandomNumber(1000, 10000), // 1〜10秒
      status: 'COMPLETED',
      metadata: { slideCount: this.generateRandomNumber(1, 20) },
      thumbnailPath: null,
      translatedFileKey: null,
      errorMessage: null,
    };
  }

  /**
   * 指定したユーザーとファイルに紐づく翻訳履歴を作成
   * @param userId ユーザーID
   * @param fileId ファイルID
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成された翻訳履歴
   */
  public async createForUserAndFile(
    userId: string,
    fileId: string,
    data: Partial<TranslationHistoryCreateInput> = {},
    tx?: PrismaClient
  ): Promise<TranslationHistory> {
    return this.create({ ...data, userId, fileId }, tx);
  }

  /**
   * 新しいユーザーとファイルを作成し、それらに紐づく翻訳履歴を作成
   * @param userData ユーザーデータ（オプション）
   * @param fileData ファイルデータ（オプション）
   * @param historyData 翻訳履歴データ（オプション）
   * @returns 作成された翻訳履歴、ファイル、ユーザー
   */
  public async createWithNewUserAndFile(
    userData = {},
    fileData = {},
    historyData = {}
  ): Promise<{ history: TranslationHistory; file: any; user: any }> {
    return this.withTransaction(async (factory, tx) => {
      const user = await this.userFactory.create(userData, tx);
      const file = await this.fileFactory.createForUser(user.id, fileData, tx);
      const history = await factory.createForUserAndFile(user.id, file.id, historyData, tx);
      return { history, file, user };
    });
  }

  /**
   * 処理中ステータスの翻訳履歴を作成
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成された翻訳履歴
   */
  public async createProcessing(data: Partial<TranslationHistoryCreateInput> = {}, tx?: PrismaClient): Promise<TranslationHistory> {
    return this.create({ ...data, status: 'PROCESSING' }, tx);
  }

  /**
   * 失敗ステータスの翻訳履歴を作成
   * @param errorMessage エラーメッセージ
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成された翻訳履歴
   */
  public async createFailed(
    errorMessage: string = 'Translation failed',
    data: Partial<TranslationHistoryCreateInput> = {},
    tx?: PrismaClient
  ): Promise<TranslationHistory> {
    return this.create({ ...data, status: 'FAILED', errorMessage }, tx);
  }

  /**
   * 特定の言語ペアの翻訳履歴を作成
   * @param sourceLang ソース言語
   * @param targetLang ターゲット言語
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成された翻訳履歴
   */
  public async createWithLanguages(
    sourceLang: Language,
    targetLang: Language,
    data: Partial<TranslationHistoryCreateInput> = {},
    tx?: PrismaClient
  ): Promise<TranslationHistory> {
    return this.create({ ...data, sourceLang, targetLang }, tx);
  }
}
