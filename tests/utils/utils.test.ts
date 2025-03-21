import { cn, formatDate } from '@/lib/utils';
import { expect } from '@jest/globals';

describe('cn function', () => {
  it('クラス名を正しく結合する', () => {
    // 基本的な結合
    expect(cn('class1', 'class2')).toBe('class1 class2');

    // 条件付きクラス
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');

    // オブジェクト形式
    expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');

    // 配列形式
    expect(cn('class1', ['class2', 'class3'])).toBe('class1 class2 class3');

    // tailwindのクラス結合（競合解決）
    expect(cn('p-4 text-red-500', 'p-6')).toBe('text-red-500 p-6');
  });

  it('空の入力を処理する', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null)).toBe('');
    expect(cn(undefined)).toBe('');
  });
});

describe('formatDate function', () => {
  it('日付を日本語形式でフォーマットする', () => {
    // 特定の日付でテスト
    const date = new Date(2023, 0, 15); // 2023年1月15日
    expect(formatDate(date)).toBe('2023年1月15日');

    // 別の日付でテスト
    const anotherDate = new Date(2024, 11, 31); // 2024年12月31日
    expect(formatDate(anotherDate)).toBe('2024年12月31日');
  });

  it('現在の日付をフォーマットする', () => {
    // 現在の日付
    const now = new Date();

    // 期待される形式（正規表現でチェック）
    const expectedPattern = /^\d{4}年\d{1,2}月\d{1,2}日$/;

    expect(formatDate(now)).toMatch(expectedPattern);
  });

  it('日付オブジェクトが必要', () => {
    // 不正な入力に対するテスト
    expect(() => {
      // @ts-ignore - 意図的に不正な型を渡す
      formatDate('2023-01-15');
    }).toThrow();
  });
});
