'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, X, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Language } from '@prisma/client';
import { HistoryFilterResult } from '@/lib/hooks/useHistoryFilter';

interface HistoryFilterProps {
  filter: HistoryFilterResult;
}

export function HistoryFilter({ filter }: HistoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      filter.setDateRange(date.toISOString(), filter.endDate);
      setStartDateOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      filter.setDateRange(filter.startDate, date.toISOString());
      setEndDateOpen(false);
    }
  };

  const clearStartDate = () => {
    filter.setDateRange(null, filter.endDate);
  };

  const clearEndDate = () => {
    filter.setDateRange(filter.startDate, null);
  };

  const languageOptions = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: '英語' },
    { value: 'zh', label: '中国語' },
    { value: 'ko', label: '韓国語' },
    { value: 'fr', label: 'フランス語' },
    { value: 'de', label: 'ドイツ語' },
    { value: 'es', label: 'スペイン語' },
    { value: 'it', label: 'イタリア語' },
    { value: 'ru', label: 'ロシア語' },
    { value: 'pt', label: 'ポルトガル語' },
  ];

  const statusOptions = [
    { value: '完了', label: '完了' },
    { value: '処理中', label: '処理中' },
    { value: 'エラー', label: 'エラー' },
  ];

  return (
    <div data-testid="history-filter" className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="ファイル名で検索..."
            value={filter.search}
            onChange={(e) => filter.setSearch(e.target.value)}
            className="pl-9"
          />
          {filter.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => filter.setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          variant={filter.isFiltered ? "default" : "outline"}
          onClick={() => setIsOpen(!isOpen)}
          className="whitespace-nowrap"
        >
          <Filter className="mr-2 h-4 w-4" />
          フィルター
          {filter.isFiltered && (
            <Badge variant="secondary" className="ml-2">
              適用中
            </Badge>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="grid gap-4 p-4 border rounded-md bg-background shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">開始日</Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="startDate"
                    data-testid="date-filter"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filter.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filter.startDate ? (
                      format(new Date(filter.startDate), 'yyyy年MM月dd日', { locale: ja })
                    ) : (
                      <span>開始日を選択</span>
                    )}
                    {filter.startDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearStartDate();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filter.startDate ? new Date(filter.startDate) : undefined}
                    onSelect={handleStartDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">終了日</Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="endDate"
                    data-testid="date-filter"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filter.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filter.endDate ? (
                      format(new Date(filter.endDate), 'yyyy年MM月dd日', { locale: ja })
                    ) : (
                      <span>終了日を選択</span>
                    )}
                    {filter.endDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearEndDate();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filter.endDate ? new Date(filter.endDate) : undefined}
                    onSelect={handleEndDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select
                value={filter.status || ""}
                onValueChange={(value) => filter.setStatus(value || null)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="すべてのステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべてのステータス</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceLang">元の言語</Label>
              <Select
                value={filter.sourceLang || ""}
                onValueChange={(value) => filter.setSourceLang(value as Language || null)}
              >
                <SelectTrigger id="sourceLang">
                  <SelectValue placeholder="すべての言語" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべての言語</SelectItem>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetLang">翻訳先の言語</Label>
              <Select
                value={filter.targetLang || ""}
                onValueChange={(value) => filter.setTargetLang(value as Language || null)}
              >
                <SelectTrigger id="targetLang">
                  <SelectValue placeholder="すべての言語" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべての言語</SelectItem>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={filter.resetFilters}>
              リセット
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              適用
            </Button>
          </div>
        </div>
      )}

      {filter.isFiltered && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filter.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              検索: {filter.search}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => filter.setSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filter.startDate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              開始日: {format(new Date(filter.startDate), 'yyyy/MM/dd', { locale: ja })}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={clearStartDate}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filter.endDate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              終了日: {format(new Date(filter.endDate), 'yyyy/MM/dd', { locale: ja })}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={clearEndDate}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filter.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              ステータス: {filter.status}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => filter.setStatus(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filter.sourceLang && (
            <Badge variant="secondary" className="flex items-center gap-1">
              元の言語: {languageOptions.find(l => l.value === filter.sourceLang)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => filter.setSourceLang(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filter.targetLang && (
            <Badge variant="secondary" className="flex items-center gap-1">
              翻訳先の言語: {languageOptions.find(l => l.value === filter.targetLang)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => filter.setTargetLang(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
