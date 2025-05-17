import { User, File, TranslationHistory, ActivityLog } from '@prisma/client';

// 基本ファクトリーインターフェース
export interface BaseFactory<T> {
  /**
   * デフォルト値を使用してモデルを作成
   */
  create(): T;

  /**
   * 指定した属性でモデルを作成
   */
  create(attributes: Partial<T>): T;

  /**
   * 複数のモデルを作成
   */
  createMany(count: number): T[];

  /**
   * 指定した属性で複数のモデルを作成
   */
  createMany(count: number, attributes: Partial<T>): T[];

  /**
   * モデルの属性を生成（DBに保存しない）
   */
  build(): T;

  /**
   * 指定した属性でモデルの属性を生成（DBに保存しない）
   */
  build(attributes: Partial<T>): T;

  /**
   * 複数のモデルの属性を生成（DBに保存しない）
   */
  buildMany(count: number): T[];

  /**
   * 指定した属性で複数のモデルの属性を生成（DBに保存しない）
   */
  buildMany(count: number, attributes: Partial<T>): T[];
}

// ユーザーファクトリーインターフェース
export interface UserFactory extends BaseFactory<User> {
  /**
   * 管理者ユーザーを作成
   */
  createAdmin(attributes?: Partial<User>): User;

  /**
   * クレジットを持つユーザーを作成
   */
  createWithCredits(credits: number, attributes?: Partial<User>): User;

  /**
   * サブスクリプション付きユーザーを作成
   */
  createWithSubscription(subscriptionId: string, attributes?: Partial<User>): User;
}

// ファイルファクトリーインターフェース
export interface FileFactory extends BaseFactory<File> {
  /**
   * 特定のユーザーに属するファイルを作成
   */
  createForUser(userId: string, attributes?: Partial<File>): File;

  /**
   * 処理済みのファイルを作成
   */
  createProcessed(attributes?: Partial<File>): File;

  /**
   * 処理中のファイルを作成
   */
  createProcessing(attributes?: Partial<File>): File;

  /**
   * エラー状態のファイルを作成
   */
  createWithError(errorMessage: string, attributes?: Partial<File>): File;
}

// 翻訳履歴ファクトリーインターフェース
export interface TranslationHistoryFactory extends BaseFactory<TranslationHistory> {
  /**
   * 特定のユーザーに属する翻訳履歴を作成
   */
  createForUser(userId: string, attributes?: Partial<TranslationHistory>): TranslationHistory;

  /**
   * 特定のファイルに関連する翻訳履歴を作成
   */
  createForFile(fileId: string, attributes?: Partial<TranslationHistory>): TranslationHistory;

  /**
   * 完了した翻訳履歴を作成
   */
  createCompleted(attributes?: Partial<TranslationHistory>): TranslationHistory;

  /**
   * 失敗した翻訳履歴を作成
   */
  createFailed(errorMessage: string, attributes?: Partial<TranslationHistory>): TranslationHistory;
}

// アクティビティログファクトリーインターフェース
export interface ActivityLogFactory extends BaseFactory<ActivityLog> {
  /**
   * 特定のユーザーに属するアクティビティログを作成
   */
  createForUser(userId: string, attributes?: Partial<ActivityLog>): ActivityLog;

  /**
   * 特定のタイプのアクティビティログを作成
   */
  createWithType(type: string, attributes?: Partial<ActivityLog>): ActivityLog;

  /**
   * 特定の日付範囲のアクティビティログを作成
   */
  createInDateRange(startDate: Date, endDate: Date, attributes?: Partial<ActivityLog>): ActivityLog;
}
