import { faker } from '@faker-js/faker/locale/ja';
import { User, TranslationHistory, CreditLog, ActivityLog } from '@prisma/client';
import { prisma } from '@/lib/db';

export type FactoryOptions<T> = {
  override?: Partial<T>;
  count?: number;
};

/**
 * ベースファクトリークラス
 */
abstract class BaseFactory<T> {
  protected abstract generate(override?: Partial<T>): Promise<T>;

  async create(options: FactoryOptions<T> = {}): Promise<T> {
    const { override } = options;
    return this.generate(override);
  }

  async createMany(options: FactoryOptions<T> = {}): Promise<T[]> {
    const { override, count = 1 } = options;
    const items: T[] = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.generate(override));
    }
    return items;
  }
}

/**
 * ユーザーデータファクトリー
 */
class UserFactory extends BaseFactory<User> {
  protected async generate(override?: Partial<User>): Promise<User> {
    const defaultData: Partial<User> = {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: 'USER',
      credits: 100,
      stripeCustomerId: faker.string.uuid(),
      createdAt: faker.date.past(),
      updatedAt: new Date(),
    };

    return prisma.user.create({
      data: { ...defaultData, ...override },
    });
  }
}

/**
 * 翻訳履歴データファクトリー
 */
class TranslationHistoryFactory extends BaseFactory<TranslationHistory> {
  protected async generate(override?: Partial<TranslationHistory>): Promise<TranslationHistory> {
    const user = await new UserFactory().create();

    const defaultData: Partial<TranslationHistory> = {
      userId: user.id,
      sourceLanguage: 'ja',
      targetLanguage: 'en',
      status: 'COMPLETED',
      pageCount: faker.number.int({ min: 1, max: 50 }),
      creditsUsed: faker.number.int({ min: 1, max: 100 }),
      originalFileName: `${faker.word.sample()}.pptx`,
      translatedFileName: `${faker.word.sample()}_translated.pptx`,
      createdAt: faker.date.past(),
      updatedAt: new Date(),
    };

    return prisma.translationHistory.create({
      data: { ...defaultData, ...override },
    });
  }
}

/**
 * クレジットログファクトリー
 */
class CreditLogFactory extends BaseFactory<CreditLog> {
  protected async generate(override?: Partial<CreditLog>): Promise<CreditLog> {
    const user = await new UserFactory().create();

    const defaultData: Partial<CreditLog> = {
      userId: user.id,
      amount: faker.number.int({ min: 10, max: 1000 }),
      type: 'PURCHASE',
      description: faker.lorem.sentence(),
      createdAt: faker.date.past(),
    };

    return prisma.creditLog.create({
      data: { ...defaultData, ...override },
    });
  }
}

/**
 * アクティビティログファクトリー
 */
class ActivityLogFactory extends BaseFactory<ActivityLog> {
  protected async generate(override?: Partial<ActivityLog>): Promise<ActivityLog> {
    const user = await new UserFactory().create();

    const defaultData: Partial<ActivityLog> = {
      userId: user.id,
      action: 'TRANSLATE',
      details: faker.lorem.sentence(),
      createdAt: faker.date.past(),
    };

    return prisma.activityLog.create({
      data: { ...defaultData, ...override },
    });
  }
}

export const factories = {
  user: new UserFactory(),
  translationHistory: new TranslationHistoryFactory(),
  creditLog: new CreditLogFactory(),
  activityLog: new ActivityLogFactory(),
}; 