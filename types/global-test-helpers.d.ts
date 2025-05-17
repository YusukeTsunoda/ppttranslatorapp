// グローバルテストヘルパーの型定義
import { User, File, TranslationHistory, ActivityLog } from '@prisma/client';
import { UserFactory, FileFactory, TranslationHistoryFactory, ActivityLogFactory } from '@/tests/factories/types';

// グローバルのテストヘルパー関数の型定義
declare global {
  /**
   * モックファイルを作成するヘルパー関数
   */
  function mockFile(name: string, size: number, type: string, lastModified?: Date): File;

  /**
   * ユーザーファクトリーのインスタンス
   */
  const userFactory: UserFactory;

  /**
   * ファイルファクトリーのインスタンス
   */
  const fileFactory: FileFactory;

  /**
   * 翻訳履歴ファクトリーのインスタンス
   */
  const translationHistoryFactory: TranslationHistoryFactory;

  /**
   * アクティビティログファクトリーのインスタンス
   */
  const activityLogFactory: ActivityLogFactory;

  /**
   * テスト用のグローバル名前空間
   */
  namespace NodeJS {
    interface Global {
      mockFile: (name: string, size: number, type: string, lastModified?: Date) => File;
      userFactory: UserFactory;
      fileFactory: FileFactory;
      translationHistoryFactory: TranslationHistoryFactory;
      activityLogFactory: ActivityLogFactory;
    }
  }
}

export {};
