'use client';

// 未使用のコンポーネントをコメントアウト
// import { Card } from '@/components/ui/card';
import { Slide, TextItem, TranslationItem, TextPosition, SlideData, ImageSize } from '../types';
import { useState, useRef, useEffect, useCallback } from 'react';
// import Image from 'next/image';
// import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
// import { Edit2, Save, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

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
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  // 未使用の状態変数をコメントアウト
  // const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // const [editValue, setEditValue] = useState('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const [internalSelectedTextIndex, setInternalSelectedTextIndex] = useState<number | null>(
    externalSelectedTextIndex || null,
  );
  const [internalHoveredTextIndex, setInternalHoveredTextIndex] = useState<number | null>(
    externalHoveredTextIndex || null,
  );
  const [imageSize, setImageSize] = useState<ImageSize>({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

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
    
    // 現在のスライドデータがある場合は詳細情報を出力
    if (slides && slides.length > 0 && currentSlide >= 0 && currentSlide < slides.length) {
      const slide = slides[currentSlide];
      console.log('Current slide data:', slide);
      console.log('Image URL:', slide.imageUrl);
      
      // 画像URLの形式を確認
      if (slide.imageUrl) {
        const urlParts = slide.imageUrl.split('/');
        console.log('Image URL parts:', urlParts);
        console.log('URL format valid?', 
          urlParts.length >= 5 && 
          urlParts[1] === 'api' && 
          urlParts[2] === 'slides' && 
          urlParts[4] === 'slides'
        );
        
        // 画像のプリロードを試みる
        const img = new Image();
        img.onload = () => console.log('PreviewSection - 画像プリロード成功:', slide.imageUrl);
        img.onerror = (e: Event) => console.error('PreviewSection - 画像プリロード失敗:', e);
        img.src = slide.imageUrl;
      }
    }
  }, [slides, currentSlide]);

  // 未使用の関数をコメントアウト
  /*
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
  */

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 }); // 位置もリセット
  };

  // ドラッグ開始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      // 拡大時のみドラッグ操作を有効にする
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
      setPosition((prev) => ({
        x: prev.x + deltaX / scale,
        y: prev.y + deltaY / scale,
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

  // 画像読み込み時にサイズを取得
  const handleImageLoad = () => {
    try {
      if (imageRef.current) {
        const { naturalWidth, naturalHeight } = imageRef.current;
        
        console.log('画像読み込み成功:', {
          url: currentSlideData?.imageUrl,
          naturalWidth,
          naturalHeight,
          element: imageRef.current,
          currentSlide,
          slideIndex: currentSlideData?.index
        });
        
        setImageSize({
          width: naturalWidth,
          height: naturalHeight,
        });
        
        // エラー状態をリセット
        setImageError(false);
        setRetryCount(0);
      }
    } catch (error) {
      console.error('画像サイズ取得エラー:', error);
    }
  };

  // 画像読み込みエラー時の再試行
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('画像読み込みエラー発生:', {
      url: currentSlideData?.imageUrl,
      element: e.currentTarget,
      error: e,
      retryCount,
      currentSlide,
      slideIndex: currentSlideData?.index
    });

    // 認証情報を含むリクエストを試みる
    fetch(currentSlideData?.imageUrl || '', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(response => {
        console.log('画像直接リクエスト結果:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url
        });
        return response.blob();
      })
      .then(blob => {
        console.log('画像ブロブ取得成功:', {
          type: blob.type,
          size: blob.size,
          url: currentSlideData?.imageUrl
        });
      })
      .catch(error => {
        console.error('画像直接リクエストエラー:', {
          error: error.message,
          url: currentSlideData?.imageUrl
        });
      });

    setImageError(true);
    
    if (retryCount < maxRetries) {
      // 再試行回数を増やす
      setRetryCount(prev => prev + 1);
      
      // 一定時間後に再試行
      setTimeout(() => {
        console.log(`画像読み込み再試行 (${retryCount + 1}/${maxRetries})...`, {
          url: currentSlideData?.imageUrl
        });
        setImageError(false); // エラー状態をリセットして再読み込み
      }, 1000 * (retryCount + 1)); // 徐々に待機時間を増やす
    } else {
      console.error('最大再試行回数に達しました:', {
        url: currentSlideData?.imageUrl,
        maxRetries
      });
    }
  };

  // スライドが変わったら再試行カウントをリセット
  useEffect(() => {
    setRetryCount(0);
    setImageError(false);
  }, [currentSlide]);

  // 画像サイズの変更を検知して位置調整を更新
  useEffect(() => {
    // 画像サイズが変更されたときにログ出力
    if (imageSize.width > 0 && imageSize.height > 0) {
      console.log('画像サイズが更新されました:', imageSize);

      // 画像コンテナのサイズも取得
      if (previewRef.current) {
        const containerRect = previewRef.current.getBoundingClientRect();
        console.log('コンテナサイズ:', {
          width: containerRect.width,
          height: containerRect.height,
        });
      }
    }
  }, [imageSize]);

  // ズーム変更時にも位置調整を更新
  useEffect(() => {
    if (imageRef.current && scale !== 1) {
      console.log('ズーム変更:', scale);
      // 強制的に再レンダリングを促す
      setImageSize((prev) => ({ ...prev }));
    }
  }, [scale]);

  // 位置情報を画像サイズに合わせて調整
  const adjustPositionToImageSize = (position: TextPosition) => {
    if (!position || !imageSize.width || !imageSize.height) return position;

    // 画像の実際の表示サイズと位置を取得
    const {
      width,
      height,
      offsetX = 0,
      offsetY = 0,
      naturalWidth = 1,
      naturalHeight = 1,
      containerWidth = 1,
    } = imageSize;

    // スケール係数を計算（画像の実際の表示サイズに基づく）
    // PPTの横幅に合わせるため、コンテナ幅を基準にスケールを計算
    const containerScale = containerWidth / naturalWidth;

    // 実際の表示スケールを計算
    const scaleX = width / naturalWidth;
    const scaleY = height / naturalHeight;

    // 位置を調整（画像のオフセットを考慮）
    return {
      x: position.x * scaleX,
      y: position.y * scaleY,
      width: position.width * scaleX,
      height: position.height * scaleY,
    };
  };

  const getHighlightStyle = (position: TextPosition, isHovered: boolean, isSelected: boolean) => {
    // positionが存在しない場合は空のオブジェクトを返す
    if (!position) {
      console.log('位置情報がありません');
      return {};
    }

    // 画像サイズに合わせて位置を調整
    const adjustedPosition = adjustPositionToImageSize(position);

    // 位置情報をログ出力（デバッグ用）
    if (isSelected || isHovered) {
      console.log('Original position:', position);
      console.log('Adjusted position:', adjustedPosition);
    }

    // 基本スタイルの定義
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${adjustedPosition.x}px`,
      top: `${adjustedPosition.y}px`,
      width: `${adjustedPosition.width}px`,
      height: `${adjustedPosition.height}px`,
      pointerEvents: 'auto', // クリックイベントを受け取れるように変更
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      zIndex: 30, // 高いz-indexを設定してクリック可能にする
      // transformOriginを追加して、ズーム時の位置を正確に保持
      transformOrigin: 'top left',
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
  const currentSlideData =
    slides && slides.length > 0 && currentSlide >= 0 && currentSlide < slides.length ? slides[currentSlide] : undefined;

  // デバッグ情報
  useEffect(() => {
    console.log('currentSlideData:', currentSlideData);
    if (currentSlideData) {
      console.log('imageUrl:', currentSlideData.imageUrl);
      console.log('texts:', currentSlideData.texts);
    }
  }, [currentSlideData]);

  // コンポーネントがマウントされたときに画像URLをログ出力
  useEffect(() => {
    if (currentSlideData?.imageUrl) {
      console.log('スライド画像URL:', {
        slideIndex: currentSlide,
        imageUrl: currentSlideData.imageUrl,
        timestamp: new Date().toISOString()
      });

      // 画像URLが有効かどうかをチェック
      fetch(currentSlideData.imageUrl, { method: 'HEAD' })
        .then(response => {
          console.log('スライド画像URLチェック結果:', {
            url: currentSlideData.imageUrl,
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          });
        })
        .catch(error => {
          console.error('スライド画像URLチェックエラー:', {
            url: currentSlideData.imageUrl,
            error: error.message
          });
        });
    }
  }, [currentSlideData, currentSlide]);

  const textItems = currentSlideData?.texts || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">プレビュー</h2>
        <div className="flex items-center space-x-2">
          {/* ズームコントロール */}
          <div className="flex items-center mr-4 space-x-1">
            <Button variant="outline" size="sm" onClick={handleZoomOut} title="縮小" className="h-8 w-8 p-0">
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
            <Button variant="outline" size="sm" onClick={handleZoomIn} title="拡大" className="h-8 w-8 p-0">
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

      <div className="flex flex-col lg:flex-row gap-4 h-full">
        <div
          ref={previewRef}
          className="relative flex-1 border rounded-md overflow-hidden bg-gray-100"
          data-testid="slide-preview"
          style={{
            cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
            minHeight: '400px', // 最小高さを設定
            height: '60vh', // 画面の60%の高さを確保
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {currentSlideData ? (
            <div
              className="relative w-full h-full flex justify-center items-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="relative"
                style={{
                  transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                  pointerEvents: 'auto', // イベントを確実に受け取る
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                {/* スライド画像 - 通常のimgタグを使用 */}
                <img
                  ref={imageRef}
                  src={currentSlideData.imageUrl}
                  alt={`スライド ${currentSlideData.index + 1}`}
                  className="max-w-full max-h-full"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.2s',
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  crossOrigin="anonymous" // CORS対応
                  data-testid="slide-image"
                />
                {imageError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-80">
                    <p className="text-red-500 font-medium mb-2">画像の読み込みに失敗しました</p>
                    <p className="text-sm text-gray-600 mb-4">URL: {currentSlideData.imageUrl}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setImageError(false);
                        setRetryCount(0);
                        console.log('画像の再読み込みを試みます:', currentSlideData.imageUrl);
                        
                        // 直接fetchを試みる
                        fetch(currentSlideData.imageUrl, {
                          credentials: 'include',
                          cache: 'no-cache'
                        })
                          .then(res => {
                            console.log('画像直接fetch結果:', {
                              status: res.status,
                              statusText: res.statusText,
                              headers: Object.fromEntries(res.headers.entries()),
                              url: res.url
                            });
                            return res.blob();
                          })
                          .then(blob => {
                            console.log('画像ブロブ取得成功:', {
                              type: blob.type,
                              size: blob.size
                            });
                            
                            // Blobから一時URLを作成して表示
                            const url = URL.createObjectURL(blob);
                            if (imageRef.current) {
                              imageRef.current.src = url;
                            }
                          })
                          .catch(error => {
                            console.error('画像直接fetch失敗:', error);
                          });
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      再読み込み
                    </Button>
                  </div>
                )}

                {/* テキスト位置のハイライト表示 */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
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
                          zIndex: isSelected ? 50 : isHovered ? 40 : 30,
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
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">スライドがありません</p>
            </div>
          )}
        </div>

        {/* 原文と翻訳テキストの表示セクション - すべてのテキストを表示 */}
        {currentSlideData && textItems.length > 0 && (
          <div className="lg:w-1/3 border rounded-md bg-white flex flex-col h-full" data-testid="translation-text">
            <div className="p-3 border-b sticky top-0 bg-white z-10">
              <h3 className="font-medium">スライド内のテキスト</h3>
              <p className="text-xs text-gray-500">プレビューを確認しながらテキストを検証できます</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(60vh - 60px)' }}>
              <div className="space-y-3">
                {textItems.map((text, index) => {
                  const isSelected = internalSelectedTextIndex === index;
                  return (
                    <div
                      key={`text-item-${index}`}
                      className={`p-2 rounded-md transition-colors duration-200 ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                      onClick={() => handleTextClick(index)}
                    >
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1 flex justify-between items-center">
                            <span>原文:</span>
                            {isSelected && (
                              <span className="text-blue-600 text-xs px-2 py-0.5 bg-blue-100 rounded-full">選択中</span>
                            )}
                          </p>
                          <div className="p-2 bg-white rounded-md min-h-[40px] border border-gray-100 text-sm">
                            {text.text || 'テキストがありません'}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">翻訳:</p>
                          <div className="p-2 bg-white rounded-md min-h-[40px] border border-gray-100 text-sm">
                            {currentSlideData.translations && currentSlideData.translations[index]
                              ? currentSlideData.translations[index].text
                              : '翻訳がありません'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
