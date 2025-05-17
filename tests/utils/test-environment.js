/**
 * テスト環境管理ユーティリティ
 * テスト環境のセットアップとクリーンアップを行うためのユーティリティ
 */

import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { cleanupTempFiles } from './test-helpers';
import { testDataManager } from '../data/test-data-manager';

// テスト環境の状態
interface TestEnvironmentState {
  initialized: boolean;
  tempDirectories: string[];
  prismaClient?: PrismaClient;
  testUsers: string[];
  testFiles: string[];
}

/**
 * テスト環境管理クラス
 */
export class TestEnvironment {
  private static instance: TestEnvironment;
  private state: TestEnvironmentState;
  private baseDirectory: string;

  private constructor() {
    this.state = {
      initialized: false,
      tempDirectories: [],
      testUsers: [],
      testFiles: [],
    };
    this.baseDirectory = path.join(process.cwd(), 'tmp', 'test-env');
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  /**
   * 初期化
   */
  public async initialize(): Promise<void> {
    if (this.state.initialized) {
      return;
    }

    try {
      // ベースディレクトリを作成
      await fs.mkdir(this.baseDirectory, { recursive: true });
      
      // テストデータマネージャーを初期化
      await testDataManager.initialize();
      
      // 環境変数を設定
      process.env.TEST_ENV = 'true';
      // NODE_ENVは読み取り専用なので、直接設定することは避ける
      // 代わりに、テスト実行時に--env NODE_ENV=testを使用する
      
      this.state.initialized = true;
      
      // 終了時にクリーンアップを実行するハンドラーを登録
      process.on('exit', () => {
        this.cleanup().catch(console.error);
      });
      
      // 例外発生時にもクリーンアップを実行するハンドラーを登録
      process.on('uncaughtException', (err) => {
        console.error('未捕捉の例外が発生しました:', err);
        this.cleanup().catch(console.error);
      });
      
      console.log('テスト環境を初期化しました');
    } catch (error) {
      console.error('テスト環境の初期化中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 一時ディレクトリを作成
   */
  public async createTempDirectory(name?: string): Promise<string> {
    const dirName = name || `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const dirPath = path.join(this.baseDirectory, dirName);
    
    await fs.mkdir(dirPath, { recursive: true });
    this.state.tempDirectories.push(dirPath);
    
    return dirPath;
  }

  /**
   * Prismaクライアントを取得または作成
   */
  public getPrismaClient(): PrismaClient {
    if (!this.state.prismaClient) {
      this.state.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || 'postgresql://testuser:testpass@localhost:5433/ppt_translator_test',
          },
        },
      });
    }
    
    return this.state.prismaClient;
  }

  /**
   * テストユーザーIDを登録
   */
  public registerTestUser(userId: string): void {
    this.state.testUsers.push(userId);
  }

  /**
   * テストファイルを登録
   */
  public registerTestFile(filePath: string): void {
    this.state.testFiles.push(filePath);
  }

  /**
   * テスト環境をクリーンアップ
   */
  public async cleanup(): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    
    try {
      // テストユーザーを削除
      if (this.state.prismaClient && this.state.testUsers.length > 0) {
        const prisma = this.state.prismaClient;
        
        // 各テストユーザーに関連するデータを削除
        for (const userId of this.state.testUsers) {
          try {
            await prisma.translationHistory.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
          } catch (error) {
            console.error(`テストユーザー ${userId} の削除中にエラーが発生しました:`, error);
          }
        }
        
        this.state.testUsers = [];
      }
      
      // テストファイルを削除
      for (const filePath of this.state.testFiles) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error(`テストファイル ${filePath} の削除中にエラーが発生しました:`, error);
        }
      }
      
      this.state.testFiles = [];
      
      // 一時ディレクトリをクリーンアップ
      for (const dirPath of this.state.tempDirectories) {
        try {
          await cleanupTempFiles(dirPath);
          await fs.rmdir(dirPath, { recursive: true });
        } catch (error) {
          console.error(`一時ディレクトリ ${dirPath} のクリーンアップ中にエラーが発生しました:`, error);
        }
      }
      
      this.state.tempDirectories = [];
      
      // Prismaクライアントを切断
      if (this.state.prismaClient) {
        await this.state.prismaClient.$disconnect();
        this.state.prismaClient = undefined;
      }
      
      console.log('テスト環境をクリーンアップしました');
    } catch (error) {
      console.error('テスト環境のクリーンアップ中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 特定のテストのセットアップ
   */
  public async setupTest(testName: string): Promise<{
    tempDir: string;
    prisma: PrismaClient;
  }> {
    await this.initialize();
    
    // テスト固有の一時ディレクトリを作成
    const tempDir = await this.createTempDirectory(`test-${testName.replace(/[^a-zA-Z0-9]/g, '-')}`);
    
    // Prismaクライアントを取得
    const prisma = this.getPrismaClient();
    
    return {
      tempDir,
      prisma,
    };
  }

  /**
   * 特定のテストのクリーンアップ
   */
  public async cleanupTest(testName: string): Promise<void> {
    // テスト固有の一時ディレクトリを検索
    const dirPattern = `test-${testName.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    const dirsToCleanup = this.state.tempDirectories.filter((dir) => dir.includes(dirPattern));
    
    // 一時ディレクトリをクリーンアップ
    for (const dirPath of dirsToCleanup) {
      try {
        await cleanupTempFiles(dirPath);
        await fs.rmdir(dirPath, { recursive: true });
        
        // リストから削除
        const index = this.state.tempDirectories.indexOf(dirPath);
        if (index !== -1) {
          this.state.tempDirectories.splice(index, 1);
        }
      } catch (error) {
        console.error(`テスト ${testName} の一時ディレクトリ ${dirPath} のクリーンアップ中にエラーが発生しました:`, error);
      }
    }
  }
}

// シングルトンインスタンスをエクスポート
export const testEnvironment = TestEnvironment.getInstance();

/**
 * テスト環境をセットアップする
 * 必要なモック、データベース接続などの初期化を行う
 */
function setupTestEnvironment() {
  // 必要に応じてここにセットアップコードを実装
  console.log('Setting up test environment...');
  return Promise.resolve(true);
}

/**
 * テスト環境をクリーンアップする
 * 接続のクローズ、一時ファイルの削除などを行う
 */
function teardownTestEnvironment() {
  // 必要に応じてここにクリーンアップコードを実装
  console.log('Tearing down test environment...');
  return Promise.resolve(true);
}

module.exports = {
  setupTestEnvironment,
  teardownTestEnvironment
};

/**
 * テスト前のセットアップ関数
 * beforeEachで使用する
 */
export function beforeEachTest(testName: string): () => Promise<{
  tempDir: string;
  prisma: PrismaClient;
}> {
  return async () => {
    return await testEnvironment.setupTest(testName);
  };
}

/**
 * テスト後のクリーンアップ関数
 * afterEachで使用する
 */
export function afterEachTest(testName: string): () => Promise<void> {
  return async () => {
    await testEnvironment.cleanupTest(testName);
  };
}
