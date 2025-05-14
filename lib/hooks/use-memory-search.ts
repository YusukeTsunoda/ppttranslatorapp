'use client';

import { useMemo, useState, useCallback } from 'react';
import { measureExecutionTime } from '@/lib/utils/performance';

interface SearchOptions<T> {
  initialItems: T[];
  searchFields: (keyof T)[];
  searchThreshold?: number;
  sortBy?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

interface SearchResult<T> {
  items: T[];
  searchQuery: string;
  totalResults: number;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: keyof T | undefined) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  resetSearch: () => void;
}

/**
 * メモリベースの高速検索とソート機能を提供するカスタムフック
 */
export function useMemorySearch<T extends Record<string, any>>({
  initialItems,
  searchFields,
  searchThreshold = 0.3,
  sortBy: initialSortBy,
  sortDirection: initialSortDirection = 'asc',
}: SearchOptions<T>): SearchResult<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<keyof T | undefined>(initialSortBy);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);

  // 検索結果をメモ化
  const items = useMemo(() => {
    return measureExecutionTime(() => {
      // 検索クエリがなければ初期アイテムを返す（ソート適用）
      if (!searchQuery.trim()) {
        return sortItems(initialItems, sortBy, sortDirection);
      }

      // 検索クエリを小文字に変換して単語に分割
      const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

      // 検索条件に一致するアイテムをフィルタリング
      const filteredItems = initialItems.filter(item => {
        // 各検索フィールドのテキストを結合して検索対象にする
        const searchText = searchFields
          .map(field => String(item[field] || ''))
          .join(' ')
          .toLowerCase();

        // 全ての検索ワードがテキスト内に存在するかチェック
        return queryWords.every(word => {
          // 完全一致かチェック
          if (searchText.includes(word)) {
            return true;
          }

          // 部分一致（閾値以上）かチェック
          // 各単語ごとに類似度をチェック
          return calculateSimilarity(searchText, word) > searchThreshold;
        });
      });

      // 結果をソート
      return sortItems(filteredItems, sortBy, sortDirection);
    }, 'Search execution');
  }, [initialItems, searchQuery, searchFields, searchThreshold, sortBy, sortDirection]);

  // 検索をリセットするコールバック
  const resetSearch = useCallback(() => {
    setSearchQuery('');
    setSortBy(initialSortBy);
    setSortDirection(initialSortDirection);
  }, [initialSortBy, initialSortDirection]);

  return {
    items,
    searchQuery,
    totalResults: items.length,
    setSearchQuery,
    setSortBy,
    setSortDirection,
    resetSearch,
  };
}

/**
 * アイテムのリストをソートする関数
 */
function sortItems<T extends Record<string, any>>(
  items: T[],
  sortBy: keyof T | undefined,
  sortDirection: 'asc' | 'desc'
): T[] {
  // ソートフィールドが指定されていなければそのまま返す
  if (!sortBy) {
    return items;
  }

  // 新しい配列にコピーしてからソート
  return [...items].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];

    // 数値かどうかで比較方法を変える
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }

    // 文字列に変換して比較
    const strA = String(valueA || '').toLowerCase();
    const strB = String(valueB || '').toLowerCase();

    return sortDirection === 'asc'
      ? strA.localeCompare(strB)
      : strB.localeCompare(strA);
  });
}

/**
 * 2つの文字列の類似度を計算する関数（レーベンシュタイン距離をベースにした類似度）
 * 返り値は0〜1の範囲で、1に近いほど類似度が高い
 */
function calculateSimilarity(str1: string, str2: string): number {
  // 短い文字列が長い文字列に含まれる場合のショートカット
  if (str1.includes(str2) || str2.includes(str1)) {
    return 1;
  }

  const len1 = str1.length;
  const len2 = str2.length;

  // どちらかが空文字列の場合
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  // レーベンシュタイン距離の計算（小さい文字列の場合のみ）
  if (len1 < 20 && len2 < 20) {
    const distance = levenshteinDistance(str1, str2);
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  }

  // 長い文字列の場合は部分一致を優先
  const commonChars = countCommonChars(str1, str2);
  return commonChars / Math.max(len1, len2);
}

/**
 * レーベンシュタイン距離を計算する関数
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // 動的計画法で距離を計算するための2次元配列
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // 初期化
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  // 距離を計算
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // 削除
        dp[i][j - 1] + 1, // 挿入
        dp[i - 1][j - 1] + cost // 置換
      );
    }
  }

  return dp[len1][len2];
}

/**
 * 2つの文字列に共通する文字の数を計算する関数
 */
function countCommonChars(str1: string, str2: string): number {
  // 文字の出現回数をカウント
  const countMap1: Record<string, number> = {};
  const countMap2: Record<string, number> = {};

  for (const char of str1) {
    countMap1[char] = (countMap1[char] || 0) + 1;
  }

  for (const char of str2) {
    countMap2[char] = (countMap2[char] || 0) + 1;
  }

  // 共通の文字の少ない方の出現回数を合計
  let commonCount = 0;
  for (const char in countMap1) {
    if (countMap2[char]) {
      commonCount += Math.min(countMap1[char], countMap2[char]);
    }
  }

  return commonCount;
} 