'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { SlideData, TextPosition } from '../types';
import { PreviewControls } from './PreviewControls';
import { SlideNavigator } from './SlideNavigator';
import { useElementSize } from '@/lib/hooks/use-element-size';

export interface EnhancedPreviewSectionProps {
  currentSlide: number;
  slides: SlideData[];
  onSlideChange: (slideIndex: number) => void;
  selectedTextIndex?: number | null;
  onTextSelect?: (index: number | null) => void;
  hoveredTextIndex?: number | null;
  onTextHover?: (index: number | null) => void;
  onTranslationEdit?: (slideIndex: number, textIndex: number, newTranslation: string) => void;
}

export const EnhancedPreviewSection = ({
  currentSlide,
  slides,
  onSlideChange,
  selectedTextIndex: externalSelectedTextIndex,
  onTextSelect,
  hoveredTextIndex: externalHoveredTextIndex,
  onTextHover,
  onTranslationEdit,
}: EnhancedPreviewSectionProps) => {
  // 状態管理
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalSelectedTextIndex, setInternalSelectedTextIndex] = useState<number | null>(
    externalSelectedTextIndex || null,
  );
  const [internalHoveredTextIndex, setInternalHoveredTextIndex] = useState<number | null>(
    externalHoveredTextIndex || null,
  );
  const [editingTranslationIndex, setEditingTranslationIndex] = useState<number | null>(null);
  const [editTranslationValue, setEditTranslationValue] = useState('');
  const [editedTranslations, setEditedTranslations] = useState<Record<number, string>>({});
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY_COUNT = 3;

  // DOM参照
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  
  // コンテナのサイズを測定
  const { width: containerWidth, height: containerHeight } = useElementSize(containerRef);
  
  // 現在のスライドデータを安全に取得
  const currentSlideData = slides && slides.length > 0 && 
    currentSlide >= 0 && currentSlide < slides.length 
      ? slides[currentSlide] 
      : undefined;

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
  
  // ズーム、パンニング関連の関数
  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);
  
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsPanning(false);
  }, []);
  
  const handleFitToScreen = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    
    const { naturalWidth, naturalHeight } = imageRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // 画像とコンテナの縦横比を計算
    const imageRatio = naturalWidth / naturalHeight;
    const containerRatio = containerRect.width / containerRect.height;
    
    // 画像がコンテナに収まる最適なスケールを計算
    let newScale;
    if (imageRatio > containerRatio) {
      // 画像が横長の場合は幅に合わせる
      newScale = (containerRect.width - 40) / naturalWidth;
    } else {
      // 画像が縦長の場合は高さに合わせる
      newScale = (containerRect.height - 40) / naturalHeight;
    }
    
    // スケールの上限・下限を設定
    newScale = Math.max(0.2, Math.min(2, newScale));
    
    setScale(newScale);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 画像読み込み完了時の処理
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      // 初回読み込み時に自動でフィットさせる
      if (scale === 1) {
        handleFitToScreen();
      }
      
      // エラー状態をリセット
      setImageError(false);
      setRetryCount(0);
    }
  }, [scale, handleFitToScreen]);
  
  // 画像読み込みエラー時の処理
  const handleImageError = useCallback(() => {
    console.error('画像読み込みエラー:', currentSlideData?.imageUrl);
    
    if (retryCount >= MAX_RETRY_COUNT) {
      setImageError(true);
    } else {
      setRetryCount(prev => prev + 1);
      
      // Fetchを使って画像をロード試行
      if (currentSlideData?.imageUrl) {
        fetch(currentSlideData.imageUrl, { 
          credentials: 'include',
          cache: 'no-cache'
        })
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.blob();
          })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            if (imageRef.current) {
              imageRef.current.src = url;
            }
          })
          .catch(err => {
            console.error('画像取得エラー:', err);
            setImageError(true);
          });
      }
    }
  }, [currentSlideData, retryCount]);
  
  // マウスイベントハンドラ
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX / scale,
        y: prev.y + deltaY / scale,
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isPanning, dragStart, scale]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // テキスト選択とホバー処理
  const handleTextClick = useCallback((index: number) => {
    const newIndex = internalSelectedTextIndex === index ? null : index;
    setInternalSelectedTextIndex(newIndex);
    if (onTextSelect) {
      onTextSelect(newIndex);
    }
  }, [internalSelectedTextIndex, onTextSelect]);
  
  const handleTextHover = useCallback((index: number | null) => {
    setInternalHoveredTextIndex(index);
    if (onTextHover) {
      onTextHover(index);
    }
  }, [onTextHover]);
  
  // 翻訳テキスト編集関連の関数
  const handleStartEditing = useCallback((index: number, text: string) => {
    setEditingTranslationIndex(index);
    setEditTranslationValue(text);
  }, []);
  
  const handleSaveTranslation = useCallback((index: number, text: string) => {
    // 編集内容を保存
    setEditedTranslations(prev => ({
      ...prev,
      [index]: text
    }));
    
    // 親コンポーネントに通知
    if (onTranslationEdit) {
      onTranslationEdit(currentSlide, index, text);
    }
    
    setEditingTranslationIndex(null);
  }, [currentSlide, onTranslationEdit]);
  
  const handleCancelEditing = useCallback(() => {
    setEditingTranslationIndex(null);
  }, []);
  
  // 位置情報を画像サイズに合わせて調整
  const adjustPositionToImageSize = useCallback((position: TextPosition) => {
    if (!position || !imageRef.current) return position;
    
    const { naturalWidth, naturalHeight } = imageRef.current;
    
    // スケーリング係数の計算
    const scaleX = naturalWidth / 3650; // 横方向のスケール係数
    const scaleY = naturalHeight / 2050; // 縦方向のスケール係数
    
    return {
      x: position.x * scaleX,
      y: position.y * scaleY,
      width: position.width * scaleX,
      height: position.height * scaleY,
    };
  }, []);
  
  // ハイライトスタイルの生成
  const getHighlightStyle = useCallback((position: TextPosition, isHovered: boolean, isSelected: boolean) => {
    if (!position) return {};
    
    // 位置情報が全て0の場合は最小サイズを設定
    const isZeroPosition = position.x === 0 && position.y === 0 && 
                          position.width === 0 && position.height === 0;
    
    // 画像サイズに合わせて位置を調整
    const adjustedPosition = adjustPositionToImageSize(position);
    
    // 最小サイズの設定
    const minWidth = 50;
    const minHeight = 20;
    
    // 基本スタイルの定義
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${adjustedPosition.x}px`,
      top: `${adjustedPosition.y}px`,
      width: `${adjustedPosition.width > 0 ? adjustedPosition.width : minWidth}px`,
      height: `${adjustedPosition.height > 0 ? adjustedPosition.height : minHeight}px`,
      pointerEvents: 'auto',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      zIndex: 30,
      transformOrigin: 'top left',
    };
    
    // 位置情報が無効な場合は特別なスタイルを適用
    if (isZeroPosition) {
      return {
        ...baseStyle,
        border: '2px solid #ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        zIndex: 45,
      };
    }
    
    // 選択されている場合
    if (isSelected) {
      return {
        ...baseStyle,
        border: '2px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        zIndex: 40,
      };
    }
    
    // ホバー中の場合
    if (isHovered) {
      return {
        ...baseStyle,
        border: '2px solid #60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        zIndex: 35,
      };
    }
    
    // 通常状態
    return {
      ...baseStyle,
      border: '1px dashed rgba(156, 163, 175, 0.5)',
      backgroundColor: 'rgba(229, 231, 235, 0.1)',
    };
  }, [adjustPositionToImageSize]);
  
  // 画像の再読み込みを試みる
  const handleRetryLoadImage = useCallback(() => {
    setImageError(false);
    setRetryCount(0);
    
    if (currentSlideData?.imageUrl && imageRef.current) {
      imageRef.current.src = `${currentSlideData.imageUrl}?t=${Date.now()}`;
    }
  }, [currentSlideData]);
  
  // スライドが変わったらリトライカウントと位置をリセット
  useEffect(() => {
    setRetryCount(0);
    setImageError(false);
    setPosition({ x: 0, y: 0 });
    
    // コンポーネントがマウントされた後や、スライドが変わった後に画像をフィットさせる
    // 少し遅延させて画像の読み込みを待つ
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentSlide, handleFitToScreen]);
  
  // 現在のスライドのテキスト
  const textItems = currentSlideData?.texts || [];
  
  return (
    <div className="flex flex-col h-full gap-4">
      {/* プレビューコントロール */}
      <PreviewControls
        scale={scale}
        onScaleChange={handleScaleChange}
        onReset={handleReset}
        onFitToScreen={handleFitToScreen}
        isPanning={isPanning}
        onPanningChange={setIsPanning}
      />
      
      <div className="flex gap-4 h-full">
        {/* メインプレビュー領域 */}
        <div 
          ref={containerRef}
          className="flex-1 border rounded-lg overflow-hidden bg-gray-50 relative flex items-center justify-center"
          style={{
            cursor: isDragging ? 'grabbing' : isPanning ? 'grab' : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          data-testid="preview-container"
        >
          {currentSlideData ? (
            <div
              ref={previewAreaRef}
              className="relative flex items-center justify-center w-full h-full"
            >
              <div
                style={{
                  transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  position: 'relative',
                }}
              >
                {/* スライド画像 */}
                <img
                  ref={imageRef}
                  src={currentSlideData.imageUrl}
                  alt={`スライド ${currentSlideData.index + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  crossOrigin="anonymous"
                  data-testid="slide-image"
                />
                
                {/* 画像エラー表示 */}
                {imageError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-80">
                    <p className="text-red-500 font-medium mb-2">画像の読み込みに失敗しました</p>
                    <button 
                      className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                      onClick={handleRetryLoadImage}
                    >
                      再読み込み
                    </button>
                  </div>
                )}
                
                {/* テキスト位置のハイライト表示 */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
                  {textItems.map((text, index) => {
                    const isHovered = internalHoveredTextIndex === index;
                    const isSelected = internalSelectedTextIndex === index;
                    const style = getHighlightStyle(text.position, isHovered, isSelected);
                    
                    // ツールチップスタイル
                    const tooltipStyle: React.CSSProperties = {
                      position: 'absolute',
                      bottom: '100%',
                      left: '0',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      opacity: isHovered || isSelected ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                      zIndex: 100,
                      pointerEvents: 'none',
                      maxWidth: '250px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    };
                    
                    return (
                      <div
                        key={`highlight-${index}`}
                        style={style}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTextClick(index);
                        }}
                        onMouseEnter={() => handleTextHover(index)}
                        onMouseLeave={() => handleTextHover(null)}
                        data-testid={`text-highlight-${index}`}
                      >
                        {/* ホバーまたは選択時にテキスト内容を表示 */}
                        {(isHovered || isSelected) && (
                          <div style={tooltipStyle}>
                            {text.text.length > 30 ? `${text.text.substring(0, 30)}...` : text.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              スライドがありません
            </div>
          )}
        </div>
        
        {/* サイドバー - スライドナビゲーター */}
        <div className="w-64 shrink-0">
          <SlideNavigator
            slides={slides}
            currentSlide={currentSlide}
            onSlideChange={onSlideChange}
          />
        </div>
      </div>
      
      {/* テキスト一覧表示 */}
      {currentSlideData && textItems.length > 0 && (
        <div className="border rounded-md overflow-hidden mt-4">
          <div className="p-3 bg-muted border-b">
            <h3 className="text-sm font-medium">テキスト一覧</h3>
          </div>
          <div className="overflow-y-auto max-h-[300px] bg-background divide-y">
            {textItems.map((text, index) => {
              const isSelected = internalSelectedTextIndex === index;
              const translation = currentSlideData.translations && 
                currentSlideData.translations[index];
              
              // 翻訳テキストを取得
              let translationText = '';
              if (editedTranslations[index]) {
                translationText = editedTranslations[index];
              } else if (translation) {
                if (typeof translation === 'object' && translation.text) {
                  translationText = translation.text;
                } else if (typeof translation === 'string') {
                  translationText = translation;
                }
              }
              
              return (
                <div 
                  key={`text-item-${index}`}
                  className={`p-3 transition-colors ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onClick={() => handleTextClick(index)}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">原文:</p>
                      <p className="text-sm">{text.text}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex justify-between">
                        <span>翻訳:</span>
                        {editingTranslationIndex !== index && (
                          <button
                            className="text-xs text-blue-500 hover:text-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditing(index, translationText);
                            }}
                          >
                            編集
                          </button>
                        )}
                      </p>
                      
                      {editingTranslationIndex === index ? (
                        <div className="flex flex-col">
                          <textarea
                            className="w-full p-2 border rounded text-sm min-h-[80px]"
                            value={editTranslationValue}
                            onChange={(e) => setEditTranslationValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`translation-edit-${index}`}
                          />
                          <div className="flex justify-end mt-2 space-x-2">
                            <button
                              className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEditing();
                              }}
                            >
                              キャンセル
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveTranslation(index, editTranslationValue);
                              }}
                              data-testid={`save-translation-${index}`}
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm">
                          {translationText || '翻訳がありません'}
                        </p>
                      )}
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