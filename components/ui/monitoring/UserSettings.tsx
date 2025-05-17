'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UserSettings {
  visibleMetrics: {
    memory_usage: boolean
    processing_time: boolean
    error_rate: boolean
  }
  graphPeriod: '1h' | '6h' | '12h' | '24h'
  updateInterval: number
  exportFormat: 'csv' | 'json' | 'excel'
}

interface UserSettingsProps {
  onSettingsChange: (settings: UserSettings) => void
}

export function UserSettings({ onSettingsChange }: UserSettingsProps) {
  const [settings, setSettings] = useState<UserSettings>({
    visibleMetrics: {
      memory_usage: true,
      processing_time: true,
      error_rate: true,
    },
    graphPeriod: '6h',
    updateInterval: 5,
    exportFormat: 'csv',
  })

  const handleMetricToggle = (metric: keyof typeof settings.visibleMetrics) => {
    const newSettings = {
      ...settings,
      visibleMetrics: {
        ...settings.visibleMetrics,
        [metric]: !settings.visibleMetrics[metric],
      },
    }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  const handlePeriodChange = (value: '1h' | '6h' | '12h' | '24h') => {
    const newSettings = { ...settings, graphPeriod: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value)
    if (!isNaN(interval) && interval > 0) {
      const newSettings = { ...settings, updateInterval: interval }
      setSettings(newSettings)
      onSettingsChange(newSettings)
    }
  }

  const handleFormatChange = (value: 'csv' | 'json' | 'excel') => {
    const newSettings = { ...settings, exportFormat: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">表示設定</h2>
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">表示するメトリクス</h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="memory-toggle">メモリ使用量</Label>
            <Switch
              id="memory-toggle"
              checked={settings.visibleMetrics.memory_usage}
              onCheckedChange={() => handleMetricToggle('memory_usage')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="time-toggle">処理時間</Label>
            <Switch
              id="time-toggle"
              checked={settings.visibleMetrics.processing_time}
              onCheckedChange={() => handleMetricToggle('processing_time')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="error-toggle">エラー率</Label>
            <Switch
              id="error-toggle"
              checked={settings.visibleMetrics.error_rate}
              onCheckedChange={() => handleMetricToggle('error_rate')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="period-select">グラフ表示期間</Label>
          <Select
            value={settings.graphPeriod}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger id="period-select">
              <SelectValue placeholder="表示期間を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1時間</SelectItem>
              <SelectItem value="6h">6時間</SelectItem>
              <SelectItem value="12h">12時間</SelectItem>
              <SelectItem value="24h">24時間</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interval-input">更新間隔（秒）</Label>
          <Input
            id="interval-input"
            type="number"
            min={1}
            value={settings.updateInterval}
            onChange={(e) => handleIntervalChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="format-select">エクスポート形式</Label>
          <Select
            value={settings.exportFormat}
            onValueChange={handleFormatChange}
          >
            <SelectTrigger id="format-select">
              <SelectValue placeholder="形式を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  )
} 