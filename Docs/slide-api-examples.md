# スライドAPI 使用例

このドキュメントでは、スライドAPIの使用例を紹介します。

## 基本的な使用例

### React コンポーネントでのスライド画像表示

```tsx
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SlideViewerProps {
  fileId: string;
  slideCount: number;
}

export const SlideViewer = ({ fileId, slideCount }: SlideViewerProps) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // スライド画像のURLを構築
  const imageUrl = `/api/slides/${fileId}/slides/${currentSlide}.png`;

  // 前のスライドに移動
  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // 次のスライドに移動
  const nextSlide = () => {
    if (currentSlide < slideCount) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  // 画像読み込み完了時の処理
  const handleImageLoad = () => {
    setLoading(false);
    setError(null);
  };

  // 画像読み込みエラー時の処理
  const handleImageError = () => {
    setLoading(false);
    setError('スライド画像の読み込みに失敗しました');
  };

  return (
    <div className="slide-viewer">
      <div className="slide-container">
        {loading && <div className="loading">読み込み中...</div>}
        {error && <div className="error">{error}</div>}
        <Image
          src={imageUrl}
          alt={`スライド ${currentSlide}`}
          width={800}
          height={600}
          crossOrigin="anonymous" // 認証情報を含めるために必要
          onLoad={handleImageLoad}
          onError={handleImageError}
          priority={true}
        />
      </div>
      <div className="slide-controls">
        <button onClick={prevSlide} disabled={currentSlide === 1}>前へ</button>
        <span>{currentSlide} / {slideCount}</span>
        <button onClick={nextSlide} disabled={currentSlide === slideCount}>次へ</button>
      </div>
    </div>
  );
};
```

### fetch APIを使用したスライド画像の取得

```typescript
/**
 * スライド画像を取得する関数
 * @param fileId ファイルID
 * @param slideNumber スライド番号
 * @param options オプション（幅、高さ、品質）
 * @returns 画像URLまたはnull
 */
export const fetchSlideImage = async (
  fileId: string,
  slideNumber: number,
  options?: { width?: number; height?: number; quality?: number }
): Promise<string | null> => {
  try {
    // クエリパラメータの構築
    const queryParams = new URLSearchParams();
    if (options?.width) queryParams.append('width', options.width.toString());
    if (options?.height) queryParams.append('height', options.height.toString());
    if (options?.quality) queryParams.append('quality', options.quality.toString());
    
    // クエリパラメータがある場合は、URLに追加
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    // APIリクエスト
    const response = await fetch(
      `/api/slides/${fileId}/slides/${slideNumber}.png${queryString}`,
      {
        credentials: 'include', // 認証情報を含める
        cache: 'force-cache', // キャッシュを使用
      }
    );
    
    if (!response.ok) {
      throw new Error(`画像の取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    // Blobとして画像を取得
    const imageBlob = await response.blob();
    return URL.createObjectURL(imageBlob);
  } catch (error) {
    console.error('スライド画像の取得エラー:', error);
    return null;
  }
};
```

## 高度な使用例

### 画像のプリロードと遅延ロード

```tsx
import { useState, useEffect } from 'react';

interface SlidePreloaderProps {
  fileId: string;
  slideCount: number;
  currentSlide: number;
  preloadCount?: number; // 先読みするスライド数
}

export const SlidePreloader = ({
  fileId,
  slideCount,
  currentSlide,
  preloadCount = 2
}: SlidePreloaderProps) => {
  useEffect(() => {
    // 現在のスライドの前後のスライドをプリロード
    const slidesToPreload = [];
    
    // 前のスライドをプリロード
    for (let i = 1; i <= preloadCount; i++) {
      const prevSlideNum = currentSlide - i;
      if (prevSlideNum >= 1) {
        slidesToPreload.push(prevSlideNum);
      }
    }
    
    // 次のスライドをプリロード
    for (let i = 1; i <= preloadCount; i++) {
      const nextSlideNum = currentSlide + i;
      if (nextSlideNum <= slideCount) {
        slidesToPreload.push(nextSlideNum);
      }
    }
    
    // プリロード実行
    slidesToPreload.forEach(slideNum => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 認証情報を含める
      img.src = `/api/slides/${fileId}/slides/${slideNum}.png`;
      
      // デバッグ用のイベントハンドラ
      img.onload = () => console.log(`スライド ${slideNum} のプリロード完了`);
      img.onerror = () => console.error(`スライド ${slideNum} のプリロード失敗`);
    });
  }, [fileId, currentSlide, slideCount, preloadCount]);
  
  return null; // このコンポーネントは何もレンダリングしない
};
```

### IntersectionObserverを使用した遅延ロード

```tsx
import { useState, useEffect, useRef } from 'react';

interface LazySlideImageProps {
  fileId: string;
  slideNumber: number;
  alt?: string;
  className?: string;
}

export const LazySlideImage = ({
  fileId,
  slideNumber,
  alt = '',
  className = ''
}: LazySlideImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // 画像のURL
  const imageUrl = `/api/slides/${fileId}/slides/${slideNumber}.png`;
  
  useEffect(() => {
    // IntersectionObserverの設定
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect(); // 一度表示されたら監視を停止
          }
        });
      },
      {
        rootMargin: '200px', // ビューポートの200px手前で読み込みを開始
        threshold: 0.01 // 1%でも表示されたら読み込み開始
      }
    );
    
    // 要素の監視を開始
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    // クリーンアップ
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return (
    <div className={`lazy-image-container ${className}`} ref={imgRef}>
      {isInView ? (
        <img
          src={imageUrl}
          alt={alt || `スライド ${slideNumber}`}
          crossOrigin="anonymous"
          className={`lazy-image ${isLoaded ? 'loaded' : ''}`}
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        <div className="placeholder">
          {/* プレースホルダーコンテンツ */}
          <div className="loading-indicator">読み込み準備中...</div>
        </div>
      )}
    </div>
  );
};
```

## 旧形式から新形式への移行例

### 旧形式のコード

```tsx
// 旧形式のスライド画像URL
const OldSlideImage = ({ fileId, slideNumber }) => {
  const imageUrl = `/api/slides/${fileId}/slide_${slideNumber}.png`;
  
  return (
    <img 
      src={imageUrl} 
      alt={`スライド ${slideNumber}`}
      className="slide-image"
    />
  );
};

// 旧形式のfetch関数
const oldFetchSlideImage = async (fileId, slideNumber) => {
  const response = await fetch(`/api/slides/${fileId}/slide_${slideNumber}.png`);
  if (!response.ok) throw new Error('画像の取得に失敗しました');
  return await response.blob();
};
```

### 新形式のコード

```tsx
// 新形式のスライド画像URL
const NewSlideImage = ({ fileId, slideNumber }) => {
  const imageUrl = `/api/slides/${fileId}/slides/${slideNumber}.png`;
  
  return (
    <img 
      src={imageUrl} 
      alt={`スライド ${slideNumber}`}
      crossOrigin="anonymous" // 認証情報を含める
      className="slide-image"
    />
  );
};

// 新形式のfetch関数
const newFetchSlideImage = async (fileId, slideNumber) => {
  const response = await fetch(
    `/api/slides/${fileId}/slides/${slideNumber}.png`,
    { credentials: 'include' } // 認証情報を含める
  );
  if (!response.ok) throw new Error('画像の取得に失敗しました');
  return await response.blob();
};
```

## エラーハンドリングの例

```tsx
import { useState } from 'react';

interface SlideImageWithErrorHandlingProps {
  fileId: string;
  slideNumber: number;
  fallbackImage?: string;
}

export const SlideImageWithErrorHandling = ({
  fileId,
  slideNumber,
  fallbackImage = '/images/slide-error.png'
}: SlideImageWithErrorHandlingProps) => {
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY = 3;
  
  const imageUrl = `/api/slides/${fileId}/slides/${slideNumber}.png`;
  
  const handleError = () => {
    if (retryCount < MAX_RETRY) {
      // リトライ
      setRetryCount(prev => prev + 1);
      // キャッシュを回避するためにタイムスタンプを追加
      const timestamp = new Date().getTime();
      const imgElement = document.getElementById(`slide-${slideNumber}`) as HTMLImageElement;
      if (imgElement) {
        imgElement.src = `${imageUrl}?t=${timestamp}`;
      }
    } else {
      // 最大リトライ回数に達したらエラー状態に
      setError(true);
    }
  };
  
  const handleRetry = () => {
    setError(false);
    setRetryCount(0);
    const timestamp = new Date().getTime();
    const imgElement = document.getElementById(`slide-${slideNumber}`) as HTMLImageElement;
    if (imgElement) {
      imgElement.src = `${imageUrl}?t=${timestamp}`;
    }
  };
  
  return (
    <div className="slide-image-container">
      {error ? (
        <div className="error-container">
          <img src={fallbackImage} alt="エラー" className="fallback-image" />
          <div className="error-message">
            <p>スライド画像の読み込みに失敗しました</p>
            <button onClick={handleRetry}>再試行</button>
          </div>
        </div>
      ) : (
        <img
          id={`slide-${slideNumber}`}
          src={imageUrl}
          alt={`スライド ${slideNumber}`}
          crossOrigin="anonymous"
          onError={handleError}
          className="slide-image"
        />
      )}
      {retryCount > 0 && !error && (
        <div className="retry-indicator">
          読み込み再試行中... ({retryCount}/{MAX_RETRY})
        </div>
      )}
    </div>
  );
};
```
