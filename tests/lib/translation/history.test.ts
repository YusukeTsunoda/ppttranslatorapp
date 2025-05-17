import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createTranslationHistory, 
  getUserTranslationHistory, 
  calculateRequiredCredits, 
  getUserCredits, 
  consumeUserCredits, 
  checkSufficientCredits 
} from '@/lib/translation/history';
import { Language, TranslationStatus } from '@prisma/client';
import { translationPrisma, userPrisma } from '@/lib/db/prisma';

// Prismaクライアントをモック
vi.mock('@/lib/db/prisma', () => {
  return {
    translationPrisma: vi.fn().mockReturnValue({
      translationHistory: {
        create: vi.fn().mockResolvedValue({
          id: 'mock-history-id',
          userId: 'mock-user-id',
          fileId: 'mock-file-id',
          status: 'COMPLETED'
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'history-1',
            userId: 'mock-user-id',
            fileId: 'mock-file-id',
            status: 'COMPLETED',
            createdAt: new Date()
          },
          {
            id: 'history-2',
            userId: 'mock-user-id',
            fileId: 'mock-file-id',
            status: 'FAILED',
            createdAt: new Date()
          }
        ])
      }
    }),
    userPrisma: vi.fn().mockReturnValue({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'mock-user-id',
          credits: 100
        }),
        update: vi.fn().mockResolvedValue({
          id: 'mock-user-id',
          credits: 90
        })
      }
    })
  };
});

describe('Translation History Module', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
  });

  describe('createTranslationHistory', () => {
    it('翻訳履歴を作成する', async () => {
      const result = await createTranslationHistory(
        'mock-user-id',
        'mock-file-id',
        'test.pptx',
        Language.en,
        Language.ja,
        'claude-3-haiku-20240307',
        10,
        10,
        1000,
        null
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('mock-user-id');
      expect(result.fileId).toBe('mock-file-id');
      expect(result.fileName).toBe('test.pptx');
      expect(result.sourceLanguage).toBe(Language.en);
      expect(result.targetLanguage).toBe(Language.ja);
      expect(result.status).toBe(TranslationStatus.COMPLETED);
      
      // Prismaクライアントのcreateメソッドが呼ばれたことを確認
      expect(translationPrisma().translationHistory.create).toHaveBeenCalled();
    });

    it('エラーがある場合はFAILEDステータスで履歴を作成する', async () => {
      const result = await createTranslationHistory(
        'mock-user-id',
        'mock-file-id',
        'test.pptx',
        Language.en,
        Language.ja,
        'claude-3-haiku-20240307',
        10,
        5, // 一部だけ翻訳完了
        1000,
        'テストエラー'
      );

      expect(result.status).toBe(TranslationStatus.FAILED);
      expect(result.error).toBe('テストエラー');
    });
  });

  describe('getUserTranslationHistory', () => {
    it('ユーザーの翻訳履歴を取得する', async () => {
      const histories = await getUserTranslationHistory('mock-user-id');
      
      expect(histories).toHaveLength(2);
      expect(histories[0].id).toBe('history-1');
      expect(histories[1].id).toBe('history-2');
      
      // PrismaクライアントのfindManyメソッドが呼ばれたことを確認
      expect(translationPrisma().translationHistory.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'mock-user-id',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
        skip: 0,
      });
    });

    it('ページネーションパラメータを指定して履歴を取得する', async () => {
      await getUserTranslationHistory('mock-user-id', 10, 20);
      
      // 指定したパラメータでfindManyが呼ばれたことを確認
      expect(translationPrisma().translationHistory.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'mock-user-id',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('calculateRequiredCredits', () => {
    it('テキスト数に基づいて必要なクレジットを計算する', () => {
      expect(calculateRequiredCredits(10)).toBe(10);
      expect(calculateRequiredCredits(0)).toBe(0);
      expect(calculateRequiredCredits(100)).toBe(100);
    });
  });

  describe('getUserCredits', () => {
    it('ユーザーのクレジット残高を取得する', async () => {
      const credits = await getUserCredits('mock-user-id');
      
      expect(credits).toBe(100);
      expect(userPrisma().user.findUnique).toHaveBeenCalledWith({
        where: { id: 'mock-user-id' },
        select: { credits: true }
      });
    });

    it('ユーザーが存在しない場合はエラーを投げる', async () => {
      // ユーザーが見つからない場合のモック
      vi.mocked(userPrisma().user.findUnique).mockResolvedValueOnce(null);
      
      await expect(getUserCredits('non-existent-user')).rejects.toThrow('ユーザーが見つかりません');
    });
  });

  describe('consumeUserCredits', () => {
    it('ユーザーのクレジットを消費する', async () => {
      const remainingCredits = await consumeUserCredits('mock-user-id', 10);
      
      expect(remainingCredits).toBe(90);
      expect(userPrisma().user.update).toHaveBeenCalledWith({
        where: { id: 'mock-user-id' },
        data: { credits: { decrement: 10 } },
        select: { credits: true }
      });
    });
  });

  describe('checkSufficientCredits', () => {
    it('クレジットが十分にある場合はtrueを返す', async () => {
      const result = await checkSufficientCredits('mock-user-id', 50);
      
      expect(result.isEnough).toBe(true);
      expect(result.available).toBe(100);
    });

    it('クレジットが不足している場合はfalseを返す', async () => {
      const result = await checkSufficientCredits('mock-user-id', 150);
      
      expect(result.isEnough).toBe(false);
      expect(result.available).toBe(100);
    });
  });
});
