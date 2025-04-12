'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { HistoryFilterResult } from '@/lib/hooks/useHistoryFilter';

interface PaginationProps {
  filter: HistoryFilterResult;
  totalPages: number;
  totalItems: number;
}

export function Pagination({ filter, totalPages, totalItems }: PaginationProps) {
  const { page, limit, setPage, setLimit } = filter;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value));
  };

  // 表示するページボタンの範囲を計算
  const getPageRange = () => {
    const delta = 1; // 現在のページの前後に表示するページ数
    const range: number[] = [];
    
    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }

    // 最初と最後のページを追加（必要な場合）
    if (range[0] > 1) {
      if (range[0] > 2) {
        range.unshift(-1); // 省略記号用の特殊値
      }
      range.unshift(1);
    }

    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) {
        range.push(-1); // 省略記号用の特殊値
      }
      range.push(totalPages);
    }

    return range;
  };

  const pageRange = getPageRange();
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);

  return (
    <div data-testid="pagination" className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="text-sm text-muted-foreground">
        {totalItems > 0 ? (
          <>
            <span>{start}</span>
            <span> - </span>
            <span>{end}</span>
            <span> / </span>
            <span>{totalItems}</span>
            <span> 件</span>
          </>
        ) : (
          <span>0 件</span>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            title="最初のページ"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            data-testid="prev-page"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            title="前のページ"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {pageRange.map((pageNum, i) => 
            pageNum === -1 ? (
              <span key={`ellipsis-${i}`} className="px-2">...</span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "outline"}
                size="icon"
                onClick={() => handlePageChange(pageNum)}
                className="w-8 h-8"
              >
                {pageNum}
              </Button>
            )
          )}
          
          <Button
            variant="outline"
            size="icon"
            data-testid="next-page"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0}
            title="次のページ"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages || totalPages === 0}
            title="最後のページ"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Select
          value={limit.toString()}
          onValueChange={handleLimitChange}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder={limit.toString()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5件</SelectItem>
            <SelectItem value="10">10件</SelectItem>
            <SelectItem value="20">20件</SelectItem>
            <SelectItem value="50">50件</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
