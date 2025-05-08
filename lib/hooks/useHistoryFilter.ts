import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Language } from '@prisma/client';

export interface HistoryFilterState {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  search: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  sourceLang: Language | null;
  targetLang: Language | null;
}

export interface HistoryFilterResult extends HistoryFilterState {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sort: string) => void;
  toggleOrder: () => void;
  setSearch: (search: string) => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setStatus: (status: string | null) => void;
  setSourceLang: (lang: Language | null) => void;
  setTargetLang: (lang: Language | null) => void;
  resetFilters: () => void;
  isFiltered: boolean;
}

const defaultFilterState: HistoryFilterState = {
  page: 1,
  limit: 10,
  sort: 'createdAt',
  order: 'desc',
  search: '',
  startDate: null,
  endDate: null,
  status: null,
  sourceLang: null,
  targetLang: null,
};

export function useHistoryFilter(): HistoryFilterResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // URLからフィルター状態を初期化
  const initializeFromUrl = useCallback(() => {
    if (!searchParams) {
      return { ...defaultFilterState };
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
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<HistoryFilterState>(() => initializeFromUrl());

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
    
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl || "");
  }, [pathname, router]);

  // フィルター変更時にURLを更新
  useEffect(() => {
    updateUrl(filters);
  }, [filters, updateUrl]);

  // URLパラメータが変更されたらフィルターを更新
  useEffect(() => {
    setFilters(initializeFromUrl());
  }, [searchParams, initializeFromUrl]);

  // フィルター操作関数
  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, page: 1, limit }));
  }, []);

  const setSort = useCallback((sort: string) => {
    setFilters(prev => ({ ...prev, sort }));
  }, []);

  const toggleOrder = useCallback(() => {
    setFilters(prev => ({ ...prev, order: prev.order === 'asc' ? 'desc' : 'asc' }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, page: 1, search }));
  }, []);

  const setDateRange = useCallback((startDate: string | null, endDate: string | null) => {
    setFilters(prev => ({ ...prev, page: 1, startDate, endDate }));
  }, []);

  const setStatus = useCallback((status: string | null) => {
    setFilters(prev => ({ ...prev, page: 1, status }));
  }, []);

  const setSourceLang = useCallback((sourceLang: Language | null) => {
    setFilters(prev => ({ ...prev, page: 1, sourceLang }));
  }, []);

  const setTargetLang = useCallback((targetLang: Language | null) => {
    setFilters(prev => ({ ...prev, page: 1, targetLang }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilterState });
  }, []);

  // フィルターが適用されているかどうか
  const isFiltered = 
    filters.search !== '' ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.status !== null ||
    filters.sourceLang !== null ||
    filters.targetLang !== null ||
    filters.sort !== 'createdAt' ||
    filters.order !== 'desc';

  return {
    ...filters,
    setPage,
    setLimit,
    setSort,
    toggleOrder,
    setSearch,
    setDateRange,
    setStatus,
    setSourceLang,
    setTargetLang,
    resetFilters,
    isFiltered,
  };
}
