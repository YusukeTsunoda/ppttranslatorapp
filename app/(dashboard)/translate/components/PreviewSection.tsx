"use client";

import { Card } from "@/components/ui/card";
import { Slide, TextItem, TranslationItem, TextPosition, SlideData } from "../types";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit2, Save, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Plus, Minus } from "lucide-react";

export interface PreviewSectionProps {
  currentSlide: number;
  slides: SlideData[];
  onSlideChange: (slideIndex: number) => void;
  selectedTextIndex?: number | null;
  onTextSelect?: (index: number | null) => void;
  hoveredTextIndex?: number | null;
  onTextHover?: (index: number | null) => void;
}

export const PreviewSectionComponent = ({
  currentSlide,
  slides,
  onSlideChange,
  selectedTextIndex: externalSelectedTextIndex,
  onTextSelect,
  hoveredTextIndex: externalHoveredTextIndex,
  onTextHover,
}: PreviewSectionProps) => {
  const [imageError, setImageError] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const [internalSelectedTextIndex, setInternalSelectedTextIndex] = useState<number | null>(externalSelectedTextIndex || null);
  const [internalHoveredTextIndex, setInternalHoveredTextIndex] = useState<number | null>(externalHoveredTextIndex || null);

  // 外部から渡されたselectedTextIndexが変更されたら内部状態を更新
  useEffect(() => {
    if (externalSelectedTextIndex !== undefined) {
      setInternalSelectedTextIndex(externalSelectedTextIndex);
    }
  }, [externalSelectedTextIndex]);
  
  // 外部から渡されたhoveredTextIndexが変更されたら内部状態を更新
  useEffect(() => {
    if (externalHoveredTextIndex !== undefined) {
      setInternalHoveredTextIndex(externalHoveredTextIndex);
    }
  }, [externalHoveredTextIndex]);

  // デバッグ情報をコンソールに出力
  useEffect(() => {
    console.log('=== PreviewSection Debug ===');
    console.log('slides:', slides);
    console.log('currentSlide:', currentSlide);
    console.log('slides.length:', slides?.length);
    console.log('Valid slide index?', currentSlide >= 0 && slides && currentSlide < slides.length);
  }, [slides, currentSlide]);

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setEditValue(text);
  };

  const saveEdit = (index: number) => {
    if (onTextSelect) {
      onTextSelect(index);
    }
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 }); // 位置もリセット
  };

  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) { // 拡大時のみドラッグ操作を有効にする
      e.preventDefault(); // デフォルトの選択動作を防止
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // ドラッグ中
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault(); // デフォルトの選択動作を防止
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // 移動の感度を調整（scale値で割ることでズームレベルに応じた移動量に調整）
      setPosition(prev => ({
        x: prev.x + deltaX / scale,
        y: prev.y + deltaY / scale
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // ドラッグ終了
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // マウスがプレビュー領域から出た場合
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleTextClick = (index: number) => {
    const newIndex = internalSelectedTextIndex === index ? null : index;
    setInternalSelectedTextIndex(newIndex);
    if (onTextSelect) {
      onTextSelect(newIndex);
    }
  };

  const handleTextHover = (index: number | null) => {
    setInternalHoveredTextIndex(index);
    if (onTextHover) {
      onTextHover(index);
    }
  };

  const getHighlightStyle = (position: TextPosition, isHovered: boolean, isSelected: boolean) => {
    // positionが存在しない場合は空のオブジェクトを返す
    if (!position) {
      console.log('位置情報がありません');
      return {};
    }

    // 基本スタイルの定義
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: `${position.width}%`,
      height: `${position.height}%`,
      pointerEvents: 'auto', // クリックイベントを受け取れるように変更
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      zIndex: 30, // 高いz-indexを設定してクリック可能にする
    };

    // 選択されている場合
    if (isSelected) {
      return {
        ...baseStyle,
        border: '2px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        zIndex: 40, // 選択中は最も前面に
      };
    }

    // ホバー中の場合
    if (isHovered) {
      return {
        ...baseStyle,
        border: '2px solid #60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        zIndex: 35, // ホバー中は少し前面に
      };
    }

    // 通常状態
    return {
      ...baseStyle,
      border: '1px dashed rgba(156, 163, 175, 0.5)', // 薄い点線で領域を示す
      backgroundColor: 'rgba(229, 231, 235, 0.1)', // 非常に薄い背景色
    };
  };

  // デバッグ用ログ出力
  useEffect(() => {
    if (slides && currentSlide >= 0 && currentSlide < slides.length) {
      console.log('現在のスライド:', currentSlide);
      console.log('選択されたテキスト:', internalSelectedTextIndex);
      console.log('スライドデータ:', slides[currentSlide]);
      if (internalSelectedTextIndex !== null) {
        console.log('選択されたテキスト内容:', slides[currentSlide]?.texts[internalSelectedTextIndex]);
        console.log('対応する翻訳:', slides[currentSlide]?.translations?.[internalSelectedTextIndex]);
      }
    }
  }, [slides, currentSlide, internalSelectedTextIndex]);

  // 現在のスライドデータを取得（安全に）
  const currentSlideData = slides && slides.length > 0 && currentSlide >= 0 && currentSlide < slides.length 
    ? slides[currentSlide] 
    : undefined;
  
  // デバッグ情報
  useEffect(() => {
    console.log('currentSlideData:', currentSlideData);
    if (currentSlideData) {
      console.log('imageUrl:', currentSlideData.imageUrl);
      console.log('texts:', currentSlideData.texts);
    }
  }, [currentSlideData]);

  const textItems = currentSlideData?.texts || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">プレビュー</h2>
        <div className="flex items-center space-x-2">
          {/* ズームコントロール */}
          <div className="flex items-center mr-4 space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              title="縮小"
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomReset}
              title="ズームリセット"
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              title="拡大"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* スライド切り替えコントロール */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSlideChange(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {currentSlide + 1} / {slides.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSlideChange(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={previewRef}
        className="relative flex-1 border rounded-md overflow-hidden bg-gray-100" 
        data-testid="slide-preview"
        style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
      >
        {currentSlideData ? (
          <div 
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div 
              className="w-full h-full"
              style={{ 
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`, 
                transformOrigin: 'center', 
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                pointerEvents: 'auto' // イベントを確実に受け取る
              }}
            >
              <img
                src={currentSlideData.imageUrl}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-full object-contain"
                data-testid="slide-image"
                draggable="false" // 画像のデフォルトドラッグを無効化
                style={{ pointerEvents: 'none' }} // 画像自体のイベントを無効化して親要素に伝播
                onLoad={() => {
                  console.log('画像読み込み成功:', currentSlideData.imageUrl);
                  setImageError(false);
                }}
                onError={(e) => {
                  console.error('画像読み込みエラー:', currentSlideData.imageUrl);
                  setImageError(true);
                }}
              />
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80">
                  <div className="text-center p-4">
                    <p className="text-red-500 font-medium">画像の読み込みに失敗しました</p>
                    <p className="text-sm text-gray-600 mt-2">URL: {currentSlideData.imageUrl}</p>
                  </div>
                </div>
              )}
              
              {/* テキスト位置のハイライト表示 */}
              {textItems.map((text, index) => {
                const isHovered = internalHoveredTextIndex === index;
                const isSelected = internalSelectedTextIndex === index;
                
                return (
                  <div
                    key={`highlight-${index}`}
                    style={{
                      ...getHighlightStyle(text.position, isHovered, isSelected),
                      // ハイライト要素は常にドラッグよりも優先してクリックできるように
                      pointerEvents: 'auto',
                      zIndex: isSelected ? 50 : (isHovered ? 40 : 30)
                    }}
                    onClick={() => handleTextClick(index)}
                    onMouseEnter={() => handleTextHover(index)}
                    onMouseLeave={() => handleTextHover(null)}
                    className="cursor-pointer"
                    data-testid={`text-highlight-${index}`}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">スライドがありません</p>
          </div>
        )}
      </div>

      {/* 原文と翻訳テキストの表示セクション - すべてのテキストを表示 */}
      {currentSlideData && textItems.length > 0 && (
        <div className="mt-4 border rounded-md p-4 bg-white" data-testid="translation-text">
          <h3 className="font-medium mb-2">スライド内のテキスト</h3>
          <div className="space-y-4">
            {textItems.map((text, index) => {
              const isSelected = internalSelectedTextIndex === index;
              return (
                <div 
                  key={`text-item-${index}`} 
                  className={`p-3 rounded-md transition-colors duration-200 ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                  onClick={() => handleTextClick(index)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        原文 {isSelected && <span className="text-blue-600">（選択中）</span>}:
                      </p>
                      <div className="p-2 bg-white rounded-md min-h-[40px] border border-gray-100">
                        {text.text || "テキストがありません"}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">翻訳:</p>
                      <div className="p-2 bg-white rounded-md min-h-[40px] border border-gray-100">
                        {currentSlideData.translations && 
                         currentSlideData.translations[index] ? 
                         currentSlideData.translations[index].text : 
                         "翻訳がありません"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}; 