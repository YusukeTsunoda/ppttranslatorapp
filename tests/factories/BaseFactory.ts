import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';

// cuidの生成用
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 25);

// Prismaクライアントのインスタンス
const prisma = new PrismaClient();

/**
 * すべてのファクトリークラスの基底クラス
 * @template T モデルの型
 * @template U 作成時のデータ型
 */
export abstract class BaseFactory<T, U> {
  /**
   * モデル名
   */
  protected abstract readonly model: string;

  /**
   * デフォルトのデータを生成する
   * @returns デフォルトデータ
   */
  protected abstract defineDefaults(): Partial<U>;

  /**
   * 与えられたデータとデフォルトデータをマージする
   * @param data 上書きするデータ
   * @returns マージされたデータ
   */
  protected mergeWithDefaults(data: Partial<U> = {}): U {
    return { ...this.defineDefaults(), ...data } as U;
  }

  /**
   * Prismaのモデルを取得する
   * @param tx トランザクションオブジェクト（オプション）
   * @returns Prismaモデル
   */
  protected getModel(tx?: PrismaClient): any {
    const client = tx || prisma;
    return client[this.model as keyof PrismaClient];
  }

  /**
   * インスタンスを構築するが、DBには保存しない
   * @param data 上書きするデータ
   * @returns 構築されたデータ
   */
  public build(data: Partial<U> = {}): U {
    return this.mergeWithDefaults(data);
  }

  /**
   * 複数のインスタンスを構築するが、DBには保存しない
   * @param count 生成する数
   * @param data 上書きするデータ（全インスタンス共通）
   * @returns 構築されたデータの配列
   */
  public buildMany(count: number, data: Partial<U> = {}): U[] {
    return Array.from({ length: count }, () => this.build(data));
  }

  /**
   * インスタンスを作成してDBに保存する
   * @param data 上書きするデータ
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたインスタンス
   */
  public async create(data: Partial<U> = {}, tx?: PrismaClient): Promise<T> {
    const model = this.getModel(tx);
    const mergedData = this.mergeWithDefaults(data);
    return model.create({ data: mergedData });
  }

  /**
   * 複数のインスタンスを作成してDBに保存する
   * @param count 生成する数
   * @param data 上書きするデータ（全インスタンス共通）
   * @param tx トランザクションオブジェクト（オプション）
   * @returns 作成されたインスタンスの配列
   */
  public async createMany(count: number, data: Partial<U> = {}, tx?: PrismaClient): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.create(data, tx));
    }
    return results;
  }

  /**
   * トランザクション内でファクトリー操作を実行する
   * @param callback トランザクション内で実行するコールバック関数
   * @returns コールバック関数の戻り値
   */
  public async withTransaction<R>(callback: (factory: this, tx: PrismaClient) => Promise<R>): Promise<R> {
    return prisma.$transaction(async (tx) => {
      return callback(this, tx as unknown as PrismaClient);
    });
  }

  /**
   * ユニークなIDを生成する（UUID v4）
   * @returns UUID文字列
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * ユニークなCUIDを生成する
   * @returns CUID文字列
   */
  protected generateCuid(): string {
    return nanoid();
  }

  /**
   * ランダムな整数を生成する
   * @param min 最小値（デフォルト: 1）
   * @param max 最大値（デフォルト: 1000）
   * @returns ランダムな整数
   */
  protected generateRandomNumber(min: number = 1, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * ランダムな文字列を生成する
   * @param prefix プレフィックス（デフォルト: 'test'）
   * @param length 追加するランダム部分の長さ（デフォルト: 8）
   * @returns ランダムな文字列
   */
  protected generateRandomString(prefix: string = 'test', length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * ユニークなメールアドレスを生成する
   * @param domain ドメイン（デフォルト: 'example.com'）
   * @returns ランダムなメールアドレス
   */
  protected generateEmail(domain: string = 'example.com'): string {
    return `${this.generateRandomString('user')}@${domain}`;
  }

  /**
   * 現在の日時を取得する
   * @returns 現在の日時
   */
  protected getCurrentDate(): Date {
    return new Date();
  }

  /**
   * 未来の日時を取得する
   * @param days 何日後か（デフォルト: 7）
   * @returns 未来の日時
   */
  protected getFutureDate(days: number = 7): Date {
    const date = this.getCurrentDate();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * 過去の日時を取得する
   * @param days 何日前か（デフォルト: 7）
   * @returns 過去の日時
   */
  protected getPastDate(days: number = 7): Date {
    const date = this.getCurrentDate();
    date.setDate(date.getDate() - days);
    return date;
  }
}
