'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize, 
  Move, 
  Download
} from 'lucide-react';
import { useState, useEffect } from 'react';

export interface PreviewControlsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  onReset: () => void;
  onFitToScreen: () => void;
  canDownload?: boolean;
  onDownload?: () => void;
  isPanning: boolean;
  onPanningChange: (isPanning: boolean) => void;
}

export const PreviewControls = ({
  scale,
  onScaleChange,
  onReset,
  onFitToScreen,
  canDownload = false,
  onDownload,
  isPanning,
  onPanningChange
}: PreviewControlsProps) => {
  const [localScale, setLocalScale] = useState(scale * 100);

  // スケール値が外部から変更された場合にローカルの値も更新
  useEffect(() => {
    setLocalScale(scale * 100);
  }, [scale]);

  // スライダーの値が変更されたときの処理
  const handleSliderChange = (value: number[]) => {
    const newScale = value[0];
    setLocalScale(newScale);
    onScaleChange(newScale / 100);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-md">
      {/* ズームコントロール */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScaleChange(Math.max(0.2, scale - 0.1))}
          disabled={scale <= 0.2}
          className="h-8 w-8 p-0"
          title="縮小"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <div className="w-[100px] px-1">
          <Slider
            value={[localScale]}
            min={20}
            max={200}
            step={5}
            onValueChange={handleSliderChange}
            className="w-full"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScaleChange(Math.min(2, scale + 0.1))}
          disabled={scale >= 2}
          className="h-8 w-8 p-0"
          title="拡大"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <span className="text-xs font-medium min-w-[40px]">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* 追加機能ボタン */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onFitToScreen}
          className="h-8 w-8 p-0"
          title="画面に合わせる"
        >
          <Maximize className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 w-8 p-0"
          title="リセット"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          variant={isPanning ? "secondary" : "outline"}
          size="sm"
          onClick={() => onPanningChange(!isPanning)}
          className="h-8 w-8 p-0"
          title={isPanning ? "移動モード解除" : "移動モード"}
        >
          <Move className="h-4 w-4" />
        </Button>
        
        {canDownload && onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="h-8 w-8 p-0"
            title="画像をダウンロード"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}; 