'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { MetricChart } from './MetricChart'
import { MetricAnalysis } from './MetricAnalysis'
import { AlertSettings } from './AlertSettings'
import { UserSettings } from './UserSettings'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from './AlertDialog'

interface Metric {
  value: number
  timestamp: string
}

interface MetricData {
  [key: string]: {
    value: number
    timestamp: string
  }
}

interface AlertThresholds {
  memory_usage: number
  processing_time: number
  error_rate: number
}

interface UserSettingsData {
  visibleMetrics: {
    memory_usage: boolean
    processing_time: boolean
    error_rate: boolean
  }
  graphPeriod: '1h' | '6h' | '12h' | '24h'
  updateInterval: number
  exportFormat: 'csv' | 'json' | 'excel'
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MetricData>({})
  const [selectedMetric, setSelectedMetric] = useState<string>('memory_usage')
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    memory_usage: 80,
    processing_time: 400,
    error_rate: 3,
  })
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [userSettings, setUserSettings] = useState<UserSettingsData>({
    visibleMetrics: {
      memory_usage: true,
      processing_time: true,
      error_rate: true,
    },
    graphPeriod: '6h',
    updateInterval: 5,
    exportFormat: 'csv',
  })
  const ws = useWebSocket('ws://localhost:8000/ws')

  useEffect(() => {
    // 初期データの取得
    fetch('http://localhost:8000/api/metrics/current')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error('Error fetching metrics:', err))

    // WebSocketメッセージの処理
    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setMetrics(data)
        checkThresholds(data)
      }
    }
  }, [ws, thresholds])

  useEffect(() => {
    // 更新間隔の設定
    const interval = setInterval(() => {
      fetch('http://localhost:8000/api/metrics/current')
        .then(res => res.json())
        .then(data => {
          setMetrics(data)
          checkThresholds(data)
        })
        .catch(err => console.error('Error fetching metrics:', err))
    }, userSettings.updateInterval * 1000)

    return () => clearInterval(interval)
  }, [userSettings.updateInterval, thresholds])

  const checkThresholds = (data: MetricData) => {
    if (data.memory_usage && data.memory_usage.value > thresholds.memory_usage) {
      setAlertMessage(`メモリ使用量が閾値(${thresholds.memory_usage}%)を超えています: ${data.memory_usage.value.toFixed(1)}%`)
      setShowAlert(true)
    }
    if (data.processing_time && data.processing_time.value > thresholds.processing_time) {
      setAlertMessage(`処理時間が閾値(${thresholds.processing_time}ms)を超えています: ${data.processing_time.value.toFixed(1)}ms`)
      setShowAlert(true)
    }
    if (data.error_rate && data.error_rate.value > thresholds.error_rate) {
      setAlertMessage(`エラー率が閾値(${thresholds.error_rate}%)を超えています: ${data.error_rate.value.toFixed(1)}%`)
      setShowAlert(true)
    }
  }

  const handleThresholdChange = (newThresholds: AlertThresholds) => {
    setThresholds(newThresholds)
  }

  const handleSettingsChange = (newSettings: UserSettingsData) => {
    setUserSettings(newSettings)
  }

  const exportData = () => {
    const data = {
      metrics,
      thresholds,
      timestamp: new Date().toISOString(),
    }

    let content: string
    let mimeType: string
    let filename: string

    switch (userSettings.exportFormat) {
      case 'json':
        content = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
        filename = 'metrics.json'
        break
      case 'csv':
        content = Object.entries(metrics)
          .map(([key, value]) => `${key},${value.value},${value.timestamp}`)
          .join('\n')
        mimeType = 'text/csv'
        filename = 'metrics.csv'
        break
      case 'excel':
        // Excel形式のエクスポートは別途実装
        return
    }

    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">パフォーマンスモニタリング</h1>
      
      {/* メトリクスの概要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userSettings.visibleMetrics.memory_usage && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">メモリ使用量</h2>
            <MetricChart
              data={metrics.memory_usage}
              type="memory"
              threshold={thresholds.memory_usage}
            />
          </Card>
        )}
        {userSettings.visibleMetrics.processing_time && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">処理時間</h2>
            <MetricChart
              data={metrics.processing_time}
              type="time"
              threshold={thresholds.processing_time}
            />
          </Card>
        )}
        {userSettings.visibleMetrics.error_rate && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">エラー率</h2>
            <MetricChart
              data={metrics.error_rate}
              type="percentage"
              threshold={thresholds.error_rate}
            />
          </Card>
        )}
      </div>

      {/* アラート設定 */}
      <AlertSettings onThresholdChange={handleThresholdChange} />

      {/* ユーザー設定 */}
      <UserSettings onSettingsChange={handleSettingsChange} />

      {/* 詳細分析 */}
      <div className="mt-8">
        <Tabs defaultValue="memory_usage" onValueChange={setSelectedMetric}>
          <TabsList>
            <TabsTrigger value="memory_usage">メモリ使用量</TabsTrigger>
            <TabsTrigger value="processing_time">処理時間</TabsTrigger>
            <TabsTrigger value="error_rate">エラー率</TabsTrigger>
          </TabsList>

          <TabsContent value="memory_usage">
            <MetricAnalysis
              metricType="memory_usage"
              type="memory"
            />
          </TabsContent>
          <TabsContent value="processing_time">
            <MetricAnalysis
              metricType="processing_time"
              type="time"
            />
          </TabsContent>
          <TabsContent value="error_rate">
            <MetricAnalysis
              metricType="error_rate"
              type="percentage"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* アラートダイアログ */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>パフォーマンスアラート</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>閉じる</AlertDialogCancel>
            <AlertDialogAction>対処する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 