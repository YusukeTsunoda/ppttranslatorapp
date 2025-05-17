'use client'

import { useEffect, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js'

// ChartJSの設定
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface MetricChartProps {
  data: {
    value: number
    timestamp: string
  }
  type: 'memory' | 'time' | 'percentage'
  threshold: number
}

const formatValue = (value: number, type: string): string => {
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

const getChartColor = (value: number, threshold: number): string => {
  return value > threshold ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)'
}

export function MetricChart({ data, type, threshold }: MetricChartProps) {
  const chartRef = useRef<ChartJS>(null)

  useEffect(() => {
    if (chartRef.current && data) {
      const chart = chartRef.current
      const value = data.value
      const color = getChartColor(value, threshold)

      chart.data.datasets[0].borderColor = color
      chart.data.datasets[0].backgroundColor = color + '20'
      chart.update()
    }
  }, [data, threshold])

  if (!data) {
    return <div>Loading...</div>
  }

  const chartData: ChartData<'line'> = {
    labels: [new Date(data.timestamp).toLocaleTimeString()],
    datasets: [
      {
        label: type === 'memory' ? 'メモリ使用量' :
               type === 'time' ? '処理時間' : 'エラー率',
        data: [data.value],
        borderColor: getChartColor(data.value, threshold),
        backgroundColor: getChartColor(data.value, threshold) + '20',
        tension: 0.4,
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return formatValue(context.raw, type)
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => formatValue(value, type)
        }
      }
    },
    animation: {
      duration: 300
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 p-2">
        <span className={`text-sm font-medium ${
          data.value > threshold ? 'text-red-500' : 'text-green-500'
        }`}>
          {formatValue(data.value, type)}
        </span>
      </div>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  )
} 