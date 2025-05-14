'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SlideData } from '../types';
import { ChevronDown, ChevronUp, Grid } from 'lucide-react';

interface SlideNavigatorProps {
  slides: SlideData[];
  currentSlide: number;
  onSlideChange: (slideIndex: number) => void;
}

export const SlideNavigator = ({
  slides,
  currentSlide,
  onSlideChange,
}: SlideNavigatorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 現在のスライドが変わった時に、そのスライドが見えるようにスクロール
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      const slideElements = scrollRef.current.querySelectorAll('.slide-thumbnail');
      if (slideElements && slideElements.length > currentSlide) {
        slideElements[currentSlide].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [currentSlide, isExpanded]);

  return (
    <div className="border rounded-md bg-white shadow-sm">
      {/* ヘッダー部分 */}
      <div className="p-3 border-b flex justify-between items-center">
        <span className="text-sm font-medium">
          スライド {currentSlide + 1} / {slides.length}
        </span>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* サムネイル一覧部分 - 展開時のみ表示 */}
      {isExpanded && (
        <div 
          ref={scrollRef}
          className="grid grid-cols-3 gap-2 p-3 max-h-[300px] overflow-y-auto"
          data-testid="slide-navigator-thumbnails"
        >
          {slides.map((slide, index) => (
            <div
              key={`slide-thumb-${index}`}
              className={`slide-thumbnail relative cursor-pointer border-2 rounded overflow-hidden transition-all ${
                currentSlide === index 
                  ? 'border-primary ring-2 ring-primary ring-opacity-30' 
                  : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => onSlideChange(index)}
              data-testid={`slide-thumbnail-${index}`}
            >
              <img
                src={slide.imageUrl}
                alt={`スライド ${index + 1}`}
                className="w-full aspect-video object-cover"
                crossOrigin="anonymous"
              />
              <div className="absolute bottom-0 right-0 bg-black bg-opacity-60 text-white text-xs px-1 rounded-tl">
                {index + 1}
              </div>
              {currentSlide === index && (
                <div className="absolute inset-0 border-2 border-primary pointer-events-none"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ナビゲーションボタン - 縮小時のみ表示 */}
      {!isExpanded && (
        <div className="flex justify-between p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSlideChange(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
          >
            <ChevronUp className="h-4 w-4 rotate-90" />
            <span className="ml-1">前へ</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSlideChange(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
          >
            <span className="mr-1">次へ</span>
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
        </div>
      )}
    </div>
  );
}; 