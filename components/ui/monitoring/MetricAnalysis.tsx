'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface MetricHistory {
  timestamp: string
  value: number
}

interface Statistics {
  average: number
  max: number
  min: number
  stdDev: number
  trend: 'up' | 'down' | 'stable'
}

interface MetricAnalysisProps {
  metricType: string
  type: 'memory' | 'time' | 'percentage'
}

export function MetricAnalysis({ metricType, type }: MetricAnalysisProps) {
  const [history, setHistory] = useState<MetricHistory[]>([])
  const [stats, setStats] = useState<Statistics | null>(null)

  useEffect(() => {
    // 履歴データの取得
    fetch(`http://localhost:8000/api/metrics/history/${metricType}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setHistory(data.data)
          calculateStatistics(data.data)
        }
      })
      .catch(err => console.error('Error fetching history:', err))
  }, [metricType])

  const calculateStatistics = (data: MetricHistory[]) => {
    if (data.length === 0) return

    const values = data.map(item => item.value)
    const average = values.reduce((a, b) => a + b, 0) / values.length
    const max = Math.max(...values)
    const min = Math.min(...values)

    // 標準偏差の計算
    const variance = values.reduce((a, b) => a + Math.pow(b - average, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    // トレンドの計算（直近10件のデータを使用）
    const recentValues = values.slice(-10)
    const firstHalf = recentValues.slice(0, 5)
    const secondHalf = recentValues.slice(-5)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const trend = secondAvg > firstAvg * 1.05 ? 'up' :
                 secondAvg < firstAvg * 0.95 ? 'down' : 'stable'

    setStats({ average, max, min, stdDev, trend })
  }

  const formatValue = (value: number): string => {
    switch (type) {
      case 'memory':
        return `${value.toFixed(1)}%`
      case 'time':
        return `${value.toFixed(1)}ms`
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toString()
    }
  }

  const exportData = () => {
    const csv = [
      ['Timestamp', 'Value'],
      ...history.map(item => [
        new Date(item.timestamp).toLocaleString(),
        item.value.toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${metricType}_history.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '↑'
      case 'down':
        return '↓'
      case 'stable':
        return '→'
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-red-500'
      case 'down':
        return 'text-green-500'
      case 'stable':
        return 'text-blue-500'
    }
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">詳細分析</h2>
        <Button onClick={exportData}>CSVエクスポート</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-sm text-gray-600">平均</div>
            <div className="text-lg font-semibold">{formatValue(stats.average)}</div>
          </div>
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-sm text-gray-600">最大</div>
            <div className="text-lg font-semibold">{formatValue(stats.max)}</div>
          </div>
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-sm text-gray-600">最小</div>
            <div className="text-lg font-semibold">{formatValue(stats.min)}</div>
          </div>
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-sm text-gray-600">標準偏差</div>
            <div className="text-lg font-semibold">{formatValue(stats.stdDev)}</div>
          </div>
        </div>
      )}

      {stats && (
        <div className="mb-6">
          <div className="text-sm text-gray-600">トレンド</div>
          <div className={`text-lg font-semibold ${getTrendColor(stats.trend)}`}>
            {getTrendIcon(stats.trend)} {
              stats.trend === 'up' ? '上昇傾向' :
              stats.trend === 'down' ? '下降傾向' : '安定'
            }
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>時刻</TableHead>
              <TableHead>値</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.slice(-10).reverse().map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  {new Date(item.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>{formatValue(item.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
} 