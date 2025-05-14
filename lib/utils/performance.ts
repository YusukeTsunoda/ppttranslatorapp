'use client';

/**
 * パフォーマンス測定用ユーティリティ関数
 */

// 処理時間を計測するユーティリティ
export function measureExecutionTime<T>(
  func: () => T,
  label: string = 'Execution time'
): T {
  if (process.env.NODE_ENV === 'production') {
    return func();
  }

  // 開始時間を記録
  const startTime = performance.now();
  
  // 関数を実行
  const result = func();
  
  // 終了時間を記録
  const endTime = performance.now();
  
  // 実行時間を計算してコンソールに出力
  console.log(`${label}: ${(endTime - startTime).toFixed(2)}ms`);
  
  return result;
}

// コンポーネントレンダリング時間を計測するカスタムフック
export function useRenderTiming(componentName: string) {
  if (process.env.NODE_ENV === 'production') {
    return { start: () => {}, end: () => {} };
  }

  const start = () => {
    performance.mark(`${componentName}-render-start`);
  };

  const end = () => {
    performance.mark(`${componentName}-render-end`);
    performance.measure(
      `${componentName} render time`,
      `${componentName}-render-start`,
      `${componentName}-render-end`
    );
    
    // 計測結果を取得してコンソールに出力
    const measurements = performance.getEntriesByName(`${componentName} render time`);
    if (measurements.length > 0) {
      console.log(`${componentName} render time: ${measurements[0].duration.toFixed(2)}ms`);
    }
    
    // マークをクリア
    performance.clearMarks(`${componentName}-render-start`);
    performance.clearMarks(`${componentName}-render-end`);
    performance.clearMeasures(`${componentName} render time`);
  };

  return { start, end };
}

// メモリ使用量を報告するユーティリティ
export function reportMemoryUsage(label: string = 'Memory usage') {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
    return;
  }
  
  if (window.performance && window.performance.memory) {
    const memory = (window.performance as any).memory;
    console.log(`${label}:`, {
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
    });
  }
}

// FPSを計測するためのユーティリティ
export class FPSMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private rafId: number | null = null;
  private stopped = false;
  private callback: (fps: number) => void;
  private interval: number;

  constructor(callback: (fps: number) => void, interval: number = 1000) {
    this.callback = callback;
    this.interval = interval;
  }

  start() {
    if (!this.rafId && !this.stopped) {
      this.frames = 0;
      this.lastTime = performance.now();
      this.loop();
    }
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop() {
    this.frames++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= this.interval) {
      const fps = Math.round((this.frames * 1000) / elapsed);
      this.callback(fps);
      this.frames = 0;
      this.lastTime = currentTime;
    }

    if (!this.stopped) {
      this.rafId = requestAnimationFrame(() => this.loop());
    }
  }
} 