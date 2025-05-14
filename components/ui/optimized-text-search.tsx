'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { measureExecutionTime } from '@/lib/utils/performance';

interface OptimizedTextSearchProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
  showSortControls?: boolean;
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  sortFields?: Array<{ id: string; label: string }>;
  debounceTime?: number;
}

/**
 * 最適化されたテキスト検索コンポーネント
 */
export const OptimizedTextSearch = memo(function OptimizedTextSearch({
  onSearch,
  placeholder = 'テキストを検索...',
  initialValue = '',
  className = '',
  showSortControls = false,
  onSortChange,
  sortFields = [],
  debounceTime = 300,
}: OptimizedTextSearchProps) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeSortField, setActiveSortField] = useState<string | null>(
    sortFields.length > 0 ? sortFields[0].id : null
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 検索処理（デバウンス）
  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);

      // 既存のタイマーをクリア
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // 新しいタイマーを設定
      const timer = setTimeout(() => {
        onSearch(value);
      }, debounceTime);

      setDebounceTimer(timer);
    },
    [debounceTimer, debounceTime, onSearch]
  );

  // 検索をクリア
  const handleClear = useCallback(() => {
    setSearchValue('');
    onSearch('');
  }, [onSearch]);

  // ソート設定を変更
  const handleSort = useCallback(
    (field: string) => {
      // 同じフィールドが選択された場合はソート方向を切り替え
      if (field === activeSortField) {
        const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortDirection(newDirection);
        
        if (onSortChange) {
          onSortChange(field, newDirection);
        }
      } 
      // 異なるフィールドが選択された場合はそのフィールドでソート
      else {
        setActiveSortField(field);
        setSortDirection('asc');
        
        if (onSortChange) {
          onSortChange(field, 'asc');
        }
      }
    },
    [activeSortField, sortDirection, onSortChange]
  );

  // 検索入力フィールド
  const searchInput = useMemo(
    () => (
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          data-testid="optimized-search-input"
        />
        {searchValue && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0"
              aria-label="検索をクリア"
              data-testid="clear-search-button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    ),
    [searchValue, placeholder, handleSearch, handleClear]
  );

  // ソートコントロール
  const sortControls = useMemo(
    () =>
      showSortControls && sortFields.length > 0 && (
        <div className="flex items-center ml-2 space-x-1">
          {sortFields.map((field) => (
            <Button
              key={field.id}
              variant={activeSortField === field.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort(field.id)}
              className="text-xs"
              aria-pressed={activeSortField === field.id}
              data-testid={`sort-${field.id}`}
            >
              {field.label}
              {activeSortField === field.id && (
                <ArrowUpDown
                  className={cn('h-3 w-3 ml-1', 
                    sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'
                  )}
                />
              )}
            </Button>
          ))}
        </div>
      ),
    [showSortControls, sortFields, activeSortField, sortDirection, handleSort]
  );

  return (
    <div className={cn('flex items-center', className)}>
      {searchInput}
      {sortControls}
    </div>
  );
}); 