'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './AlertDialog'

interface AlertThresholds {
  memory_usage: number
  processing_time: number
  error_rate: number
}

interface AlertSettingsProps {
  onThresholdChange: (thresholds: AlertThresholds) => void
}

export function AlertSettings({ onThresholdChange }: AlertSettingsProps) {
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    memory_usage: 80,
    processing_time: 400,
    error_rate: 3,
  })

  const handleThresholdChange = (metric: keyof AlertThresholds, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      const newThresholds = { ...thresholds, [metric]: numValue }
      setThresholds(newThresholds)
      onThresholdChange(newThresholds)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">アラート設定</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="memory-threshold">メモリ使用量閾値 (%)</Label>
          <Input
            id="memory-threshold"
            type="number"
            value={thresholds.memory_usage}
            onChange={(e) => handleThresholdChange('memory_usage', e.target.value)}
            min={0}
            max={100}
          />
        </div>
        <div>
          <Label htmlFor="time-threshold">処理時間閾値 (ms)</Label>
          <Input
            id="time-threshold"
            type="number"
            value={thresholds.processing_time}
            onChange={(e) => handleThresholdChange('processing_time', e.target.value)}
            min={0}
          />
        </div>
        <div>
          <Label htmlFor="error-threshold">エラー率閾値 (%)</Label>
          <Input
            id="error-threshold"
            type="number"
            value={thresholds.error_rate}
            onChange={(e) => handleThresholdChange('error_rate', e.target.value)}
            min={0}
            max={100}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">アラートテスト</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>パフォーマンスアラート</AlertDialogTitle>
              <AlertDialogDescription>
                メモリ使用量が閾値を超えています。
                システムのパフォーマンスに影響を与える可能性があります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>閉じる</AlertDialogCancel>
              <AlertDialogAction>対処する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
} 