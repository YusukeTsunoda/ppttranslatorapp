import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Language, TranslationStatus } from '@prisma/client';
// import { Language } from '@prisma/client'; // ← 削除

export interface HistoryFilterState {
  search: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  sourceLang: Language | null;
  targetLang: Language | null;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
  // 新しいフィルタパラメータを追加
  minPageCount: number | null;
  maxPageCount: number | null;
  minCreditsUsed: number | null;
  maxCreditsUsed: number | null;
  minFileSize: number | null;
  maxFileSize: number | null;
  tags: string[] | null;
}

export interface HistoryFilterResult extends HistoryFilterState {
  setSearch: (search: string) => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setStatus: (status: string | null) => void;
  setSourceLang: (lang: Language | null) => void;
  setTargetLang: (lang: Language | null) => void;
  setSort: (field: string) => void;
  setOrder: (order: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  // 新しいフィルタパラメータのセッター
  setPageCountRange: (min: number | null, max: number | null) => void;
  setCreditsRange: (min: number | null, max: number | null) => void;
  setFileSizeRange: (min: number | null, max: number | null) => void;
  setTags: (tags: string[] | null) => void;
  reset: () => void;
  isFiltered: boolean;
}

const initialState: HistoryFilterState = {
  search: '',
  startDate: null,
  endDate: null,
  status: null,
  sourceLang: null,
  targetLang: null,
  sort: 'createdAt',
  order: 'desc',
  page: 1,
  limit: 10,
  // 新しいフィルタパラメータの初期値
  minPageCount: null,
  maxPageCount: null,
  minCreditsUsed: null,
  maxCreditsUsed: null,
  minFileSize: null,
  maxFileSize: null,
  tags: null,
};

export function useHistoryFilter(): HistoryFilterResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // URLからフィルター状態を初期化
  const initializeFromUrl = useCallback(() => {
    if (!searchParams) {
      return { ...initialState };
    }
    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sort: searchParams.get('sort') || 'createdAt',
      order: (searchParams.get('order') || 'desc') as 'asc' | 'desc',
      search: searchParams.get('search') || '',
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      sourceLang: searchParams.get('sourceLang') as Language | null,
      targetLang: searchParams.get('targetLang') as Language | null,
      minPageCount: searchParams.get('minPageCount') ? parseInt(searchParams.get('minPageCount') as string) : null,
      maxPageCount: searchParams.get('maxPageCount') ? parseInt(searchParams.get('maxPageCount') as string) : null,
      minCreditsUsed: searchParams.get('minCreditsUsed') ? parseInt(searchParams.get('minCreditsUsed') as string) : null,
      maxCreditsUsed: searchParams.get('maxCreditsUsed') ? parseInt(searchParams.get('maxCreditsUsed') as string) : null,
      minFileSize: searchParams.get('minFileSize') ? parseInt(searchParams.get('minFileSize') as string) : null,
      maxFileSize: searchParams.get('maxFileSize') ? parseInt(searchParams.get('maxFileSize') as string) : null,
      tags: searchParams.get('tags') ? searchParams.get('tags')?.split(',') : null,
    };
  }, [searchParams]);

  const [filter, setFilter] = useState<HistoryFilterState>(() => initializeFromUrl());

  // URLを更新する関数
  const updateUrl = useCallback((newFilters: HistoryFilterState) => {
    const params = new URLSearchParams();
    
    if (newFilters.page !== 1) params.set('page', newFilters.page.toString());
    if (newFilters.limit !== 10) params.set('limit', newFilters.limit.toString());
    if (newFilters.sort !== 'createdAt') params.set('sort', newFilters.sort);
    if (newFilters.order !== 'desc') params.set('order', newFilters.order);
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.startDate) params.set('startDate', newFilters.startDate);
    if (newFilters.endDate) params.set('endDate', newFilters.endDate);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.sourceLang) params.set('sourceLang', newFilters.sourceLang);
    if (newFilters.targetLang) params.set('targetLang', newFilters.targetLang);
    if (newFilters.minPageCount) params.set('minPageCount', newFilters.minPageCount.toString());
    if (newFilters.maxPageCount) params.set('maxPageCount', newFilters.maxPageCount.toString());
    if (newFilters.minCreditsUsed) params.set('minCreditsUsed', newFilters.minCreditsUsed.toString());
    if (newFilters.maxCreditsUsed) params.set('maxCreditsUsed', newFilters.maxCreditsUsed.toString());
    if (newFilters.minFileSize) params.set('minFileSize', newFilters.minFileSize.toString());
    if (newFilters.maxFileSize) params.set('maxFileSize', newFilters.maxFileSize.toString());
    if (newFilters.tags) params.set('tags', newFilters.tags.join(','));
    
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl || "");
  }, [pathname, router]);

  // フィルター変更時にURLを更新
  useEffect(() => {
    updateUrl(filter);
  }, [filter, updateUrl]);

  // URLパラメータが変更されたらフィルターを更新
  useEffect(() => {
    setFilter(initializeFromUrl());
  }, [searchParams, initializeFromUrl]);

  // フィルター操作関数
  const setSearch = useCallback((search: string) => {
    setFilter(prev => ({ ...prev, search, page: 1 }));
  }, []);

  const setDateRange = useCallback((startDate: string | null, endDate: string | null) => {
    setFilter(prev => ({ ...prev, startDate, endDate, page: 1 }));
  }, []);

  const setStatus = useCallback((status: string | null) => {
    setFilter(prev => ({ ...prev, status, page: 1 }));
  }, []);

  const setSourceLang = useCallback((sourceLang: Language | null) => {
    setFilter(prev => ({ ...prev, sourceLang, page: 1 }));
  }, []);

  const setTargetLang = useCallback((targetLang: Language | null) => {
    setFilter(prev => ({ ...prev, targetLang, page: 1 }));
  }, []);

  const setSort = useCallback((sort: string) => {
    setFilter(prev => ({ ...prev, sort }));
  }, []);

  const setOrder = useCallback((order: 'asc' | 'desc') => {
    setFilter(prev => ({ ...prev, order }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilter(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFilter(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // 新しいフィルタパラメータのセッター
  const setPageCountRange = useCallback((min: number | null, max: number | null) => {
    setFilter(prev => ({ ...prev, minPageCount: min, maxPageCount: max, page: 1 }));
  }, []);

  const setCreditsRange = useCallback((min: number | null, max: number | null) => {
    setFilter(prev => ({ ...prev, minCreditsUsed: min, maxCreditsUsed: max, page: 1 }));
  }, []);

  const setFileSizeRange = useCallback((min: number | null, max: number | null) => {
    setFilter(prev => ({ ...prev, minFileSize: min, maxFileSize: max, page: 1 }));
  }, []);

  const setTags = useCallback((tags: string[] | null) => {
    setFilter(prev => ({ ...prev, tags, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setFilter(initialState);
  }, []);

  // フィルターが適用されているかどうか
  const isFiltered = useMemo(() => {
    return (
      filter.search !== initialState.search ||
      filter.startDate !== initialState.startDate ||
      filter.endDate !== initialState.endDate ||
      filter.status !== initialState.status ||
      filter.sourceLang !== initialState.sourceLang ||
      filter.targetLang !== initialState.targetLang ||
      filter.minPageCount !== initialState.minPageCount ||
      filter.maxPageCount !== initialState.maxPageCount ||
      filter.minCreditsUsed !== initialState.minCreditsUsed ||
      filter.maxCreditsUsed !== initialState.maxCreditsUsed ||
      filter.minFileSize !== initialState.minFileSize ||
      filter.maxFileSize !== initialState.maxFileSize ||
      (filter.tags !== initialState.tags && filter.tags?.length !== 0)
    );
  }, [filter]);

  return {
    ...filter,
    setSearch,
    setDateRange,
    setStatus,
    setSourceLang,
    setTargetLang,
    setSort,
    setOrder,
    setPage,
    setLimit,
    setPageCountRange,
    setCreditsRange,
    setFileSizeRange,
    setTags,
    reset,
    isFiltered,
  };
}
