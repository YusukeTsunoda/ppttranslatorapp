'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { HistoryFilterResult } from '@/lib/hooks/useHistoryFilter';

interface HistorySortProps {
  filter: HistoryFilterResult;
}

export function HistorySort({ filter }: HistorySortProps) {
  const sortOptions = [
    { value: 'createdAt', label: '日付' },
    { value: 'fileName', label: 'ファイル名' },
    { value: 'fileSize', label: 'ファイルサイズ' },
    { value: 'pageCount', label: 'ページ数' },
    { value: 'creditsUsed', label: 'クレジット使用量' },
  ];

  return (
    <div data-testid="history-sort" className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">並び替え:</span>
      <Select
        data-testid="sort-select"
        value={filter.sort}
        onValueChange={filter.setSort}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="並び替え" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={filter.toggleOrder}
        title={filter.order === 'asc' ? '昇順' : '降順'}
      >
        {filter.order === 'asc' ? (
          <ArrowUpAZ className="h-4 w-4" />
        ) : (
          <ArrowDownAZ className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
