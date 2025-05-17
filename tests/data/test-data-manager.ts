/**
 * テストデータマネージャー
 * テストデータの一元管理と自動生成を行うためのクラス
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateTestData, cleanupTempFiles, createTestDataDirectory } from '../utils/test-helpers';

// テストデータの種類
export enum TestDataType {
  PPTX = 'pptx',
  JSON = 'json',
  TXT = 'txt',
}

// テストデータのサイズ
export enum TestDataSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

// テストデータの情報
export interface TestDataInfo {
  id: string;
  path: string;
  name: string;
  type: TestDataType;
  size: number;
  createdAt: Date;
}

/**
 * テストデータマネージャークラス
 */
export class TestDataManager {
  private static instance: TestDataManager;
  private dataRegistry: Map<string, TestDataInfo>;
  private baseDirectory: string;

  private constructor() {
    this.dataRegistry = new Map<string, TestDataInfo>();
    this.baseDirectory = path.join(process.cwd(), 'tmp', 'test-data');
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): TestDataManager {
    if (!TestDataManager.instance) {
      TestDataManager.instance = new TestDataManager();
    }
    return TestDataManager.instance;
  }

  /**
   * 初期化
   */
  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDirectory, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
  }

  /**
   * テストデータを生成
   */
  public async generateData(
    type: TestDataType,
    options: {
      size?: TestDataSize;
      name?: string;
      content?: string;
      directory?: string;
    } = {}
  ): Promise<TestDataInfo> {
    const { size = TestDataSize.SMALL, name, content } = options;
    const directory = options.directory || this.baseDirectory;
    
    // ディレクトリが存在することを確認
    await fs.mkdir(directory, { recursive: true });
    
    // ファイル名が指定されていない場合は自動生成
    const fileName = name || `test-${uuidv4()}.${type}`;
    
    // テストデータを生成
    const data = await generateTestData({
      type,
      size,
      name: fileName,
      content,
      directory,
    });
    
    // テストデータ情報を作成
    const dataInfo: TestDataInfo = {
      id: uuidv4(),
      path: data.path,
      name: data.name,
      type: type as TestDataType,
      size: data.size,
      createdAt: new Date(),
    };
    
    // レジストリに登録
    this.dataRegistry.set(dataInfo.id, dataInfo);
    
    return dataInfo;
  }

  /**
   * テストデータを取得
   */
  public getDataById(id: string): TestDataInfo | undefined {
    return this.dataRegistry.get(id);
  }

  /**
   * テストデータを検索
   */
  public findData(
    criteria: {
      type?: TestDataType;
      name?: string;
      minSize?: number;
      maxSize?: number;
    } = {}
  ): TestDataInfo[] {
    const { type, name, minSize, maxSize } = criteria;
    
    return Array.from(this.dataRegistry.values()).filter((data) => {
      if (type && data.type !== type) return false;
      if (name && !data.name.includes(name)) return false;
      if (minSize !== undefined && data.size < minSize) return false;
      if (maxSize !== undefined && data.size > maxSize) return false;
      return true;
    });
  }

  /**
   * テストデータを削除
   */
  public async deleteData(id: string): Promise<boolean> {
    const data = this.dataRegistry.get(id);
    if (!data) return false;
    
    try {
      await fs.unlink(data.path);
      this.dataRegistry.delete(id);
      return true;
    } catch (error) {
      console.error(`テストデータの削除中にエラーが発生しました: ${error}`);
      return false;
    }
  }

  /**
   * すべてのテストデータをクリーンアップ
   */
  public async cleanupAll(): Promise<void> {
    // レジストリをクリア
    this.dataRegistry.clear();
    
    // 一時ファイルをクリーンアップ
    await cleanupTempFiles(this.baseDirectory);
  }

  /**
   * 特定のタイプのテストデータをすべて削除
   */
  public async cleanupByType(type: TestDataType): Promise<void> {
    const dataToDelete: string[] = [];
    
    // 削除対象のデータIDを収集
    this.dataRegistry.forEach((data, id) => {
      if (data.type === type) {
        dataToDelete.push(id);
      }
    });
    
    // データを削除
    for (const id of dataToDelete) {
      await this.deleteData(id);
    }
  }

  /**
   * 古いテストデータを削除（指定した日数より前に作成されたデータ）
   */
  public async cleanupOldData(olderThanDays: number = 7): Promise<void> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const dataToDelete: string[] = [];
    
    // 削除対象のデータIDを収集
    this.dataRegistry.forEach((data, id) => {
      if (data.createdAt < cutoffDate) {
        dataToDelete.push(id);
      }
    });
    
    // データを削除
    for (const id of dataToDelete) {
      await this.deleteData(id);
    }
  }

  /**
   * テストデータの統計情報を取得
   */
  public getStatistics(): {
    totalCount: number;
    totalSize: number;
    countByType: Record<TestDataType, number>;
    sizeByType: Record<TestDataType, number>;
  } {
    const stats = {
      totalCount: 0,
      totalSize: 0,
      countByType: {
        [TestDataType.PPTX]: 0,
        [TestDataType.JSON]: 0,
        [TestDataType.TXT]: 0,
      },
      sizeByType: {
        [TestDataType.PPTX]: 0,
        [TestDataType.JSON]: 0,
        [TestDataType.TXT]: 0,
      },
    };
    
    this.dataRegistry.forEach((data) => {
      stats.totalCount++;
      stats.totalSize += data.size;
      stats.countByType[data.type]++;
      stats.sizeByType[data.type] += data.size;
    });
    
    return stats;
  }
}

// シングルトンインスタンスをエクスポート
export const testDataManager = TestDataManager.getInstance();
