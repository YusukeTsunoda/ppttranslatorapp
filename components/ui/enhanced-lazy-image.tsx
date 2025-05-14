'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { imageCache } from '@/lib/utils/image-cache';
import { measureExecutionTime } from '@/lib/utils/performance';

interface EnhancedLazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  loadingIndicator?: React.ReactNode;
  threshold?: number;
  skipLazy?: boolean;
  onLoadSuccess?: () => void;
  onLoadError?: (error: Error) => void;
  placeholderColor?: string;
  blur?: boolean;
  priority?: boolean;
  sizes?: string;
}

/**
 * パフォーマンスが最適化された拡張LazyImageコンポーネント
 */
const EnhancedLazyImage = memo(function EnhancedLazyImage({
  src,
  alt = '',
  className = '',
  fallback,
  loadingIndicator,
  threshold = 0.1,
  skipLazy = false,
  onLoadSuccess,
  onLoadError,
  placeholderColor = 'bg-gray-200',
  blur = false,
  priority = false,
  sizes,
  ...props
}: EnhancedLazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(skipLazy || priority);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // 画像のロード処理
  const loadImage = useCallback(async () => {
    if (!src) return;

    try {
      const cachedSrc = await measureExecutionTime(
        () => imageCache.getImage(src),
        'Image cache lookup'
      );
      setImageSrc(cachedSrc);
    } catch (error) {
      console.error('Failed to load image:', error);
      setIsError(true);
      
      if (onLoadError && error instanceof Error) {
        onLoadError(error);
      }
    }
  }, [src, onLoadError]);

  // 画像が表示領域に入ったときに読み込みを開始
  useEffect(() => {
    if (!placeholderRef.current || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold, 
        rootMargin: '200px' // 表示領域の200px手前から読み込みを開始
      }
    );

    observer.observe(placeholderRef.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, isVisible]);

  // 画像が表示領域に入ったら読み込み開始
  useEffect(() => {
    if (isVisible && !imageSrc && !isError) {
      loadImage();
    }
  }, [isVisible, imageSrc, isError, loadImage]);

  // 画像読み込み完了時の処理
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    if (onLoadSuccess) onLoadSuccess();
  }, [onLoadSuccess]);

  // 画像読み込みエラー時の処理
  const handleError = useCallback(() => {
    setIsError(true);
    
    const err = new Error(`Failed to load image: ${src}`);
    if (onLoadError) onLoadError(err);
  }, [src, onLoadError]);

  // エラー発生時やフォールバックの表示
  if (isError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {/* プレースホルダー（ローディング中表示） */}
      {(!isLoaded || !imageSrc) && (
        <div 
          ref={placeholderRef}
          className={cn(
            'absolute inset-0 flex items-center justify-center', 
            placeholderColor
          )}
          aria-hidden="true"
        >
          {loadingIndicator || (
            <Skeleton className="w-full h-full rounded" />
          )}
        </div>
      )}

      {/* 実際の画像 */}
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={cn(
            blur && !isLoaded ? 'blur-sm scale-105' : 'blur-0',
            'transition-all duration-300 ease-in-out w-full h-auto',
            className
          )}
          style={{
            opacity: isLoaded ? 1 : 0,
          }}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
});

export { EnhancedLazyImage }; 