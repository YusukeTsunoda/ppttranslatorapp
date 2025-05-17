'use client';

import { useEffect, useState } from 'react';
import { MetricsChart } from '@/components/ui/monitoring/MetricsChart';
import { useMetricsWebSocket } from '@/lib/hooks/useMetricsWebSocket';

interface MetricHistory {
  timestamp: string;
  value: number;
}

export default function MonitoringDashboard() {
  const [memoryHistory, setMemoryHistory] = useState<MetricHistory[]>([]);
  const [timeHistory, setTimeHistory] = useState<MetricHistory[]>([]);
  const [errorHistory, setErrorHistory] = useState<MetricHistory[]>([]);

  const { metrics, isConnected, error, getMetricHistory } = useMetricsWebSocket(
    `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws`
  );

  useEffect(() => {
    // 初期データの取得
    const fetchInitialData = async () => {
      const [memoryData, timeData, errorData] = await Promise.all([
        getMetricHistory('memory_usage'),
        getMetricHistory('processing_time'),
        getMetricHistory('error_rate')
      ]);

      setMemoryHistory(memoryData);
      setTimeHistory(timeData);
      setErrorHistory(errorData);
    };

    fetchInitialData();
  }, [getMetricHistory]);

  // 新しいメトリクスが到着したら履歴を更新
  useEffect(() => {
    if (metrics.memory_usage) {
      setMemoryHistory(prev => [...prev, metrics.memory_usage!].slice(-50));
    }
    if (metrics.processing_time) {
      setTimeHistory(prev => [...prev, metrics.processing_time!].slice(-50));
    }
    if (metrics.error_rate) {
      setErrorHistory(prev => [...prev, metrics.error_rate!].slice(-50));
    }
  }, [metrics]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">パフォーマンスモニタリング</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? '接続中' : '未接続'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricsChart
          data={memoryHistory}
          title="メモリ使用量"
          color="#2563eb"
          threshold={500} // 500MB制限
        />
        <MetricsChart
          data={timeHistory}
          title="処理時間"
          color="#16a34a"
          threshold={1000} // 1秒制限
        />
        <MetricsChart
          data={errorHistory}
          title="エラー率"
          color="#dc2626"
          threshold={5} // 5%制限
        />
      </div>
    </div>
  );
} 