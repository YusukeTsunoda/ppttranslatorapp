'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  loadingIndicator?: React.ReactNode;
  threshold?: number; // Intersection Observer閾値
  skipLazy?: boolean; // 遅延読み込みをスキップするかどうか
  onLoadSuccess?: () => void;
  onLoadError?: (error: Error) => void;
}

export function LazyImage({
  src,
  alt,
  className,
  fallback,
  loadingIndicator,
  threshold = 0.1,
  skipLazy = false,
  onLoadSuccess,
  onLoadError,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(skipLazy);
  const [error, setError] = useState<Error | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // 画像が表示領域に入ったときに読み込みを開始
  useEffect(() => {
    if (!imgRef.current || skipLazy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold, // 画像の10%が表示されたときに読み込みを開始
        rootMargin: '200px' // 表示領域の200px手前から読み込みを開始
      }
    );

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, skipLazy]);

  // 画像読み込み完了時の処理
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoadSuccess) onLoadSuccess();
  };

  // 画像読み込みエラー時の処理
  const handleError = () => {
    const err = new Error(`Failed to load image: ${src}`);
    setError(err);
    if (onLoadError) onLoadError(err);
  };

  // エラー発生時やフォールバックの表示
  if (error && fallback) {
    return <>{fallback}</>;
  }

  // 画像のスタイル
  const imageStyle: React.CSSProperties = {
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
  };

  return (
    <div className="relative inline-block">
      {/* プレースホルダー（ローディング中表示） */}
      {!isLoaded && (
        <div 
          ref={placeholderRef}
          className={cn('absolute inset-0 flex items-center justify-center', className)}
        >
          {loadingIndicator || (
            <Skeleton className={cn('w-full h-full rounded', className)} />
          )}
        </div>
      )}

      {/* 実際の画像 */}
      {isVisible && (
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          className={className}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
} 