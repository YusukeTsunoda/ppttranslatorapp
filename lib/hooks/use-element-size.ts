'use client';

import { useState, useEffect, RefObject } from 'react';

type Size = {
  width: number;
  height: number;
};

export function useElementSize(ref: RefObject<HTMLElement>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const updateSize = () => {
      if (ref.current) {
        const { width, height } = ref.current.getBoundingClientRect();
        setSize({ width, height });
      }
    };

    // 初期サイズを設定
    updateSize();

    // ResizeObserverを使用して要素のサイズ変更を監視
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(ref.current);

    return () => {
      if (ref.current) {
        resizeObserver.unobserve(ref.current);
      }
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
} 