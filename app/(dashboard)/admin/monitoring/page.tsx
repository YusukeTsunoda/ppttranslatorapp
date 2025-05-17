'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { metricsCollector, SystemMetrics } from '@/lib/monitoring/metrics';
import { alertManager, Alert as AlertType } from '@/lib/monitoring/alerts';
import { formatBytes, formatNumber } from '@/lib/utils';

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics>(metricsCollector.getMetrics());
  const [alerts, setAlerts] = useState<AlertType[]>(alertManager.getAlerts());

  useEffect(() => {
    // メトリクスの更新をリッスン
    const metricsListener = (newMetrics: SystemMetrics) => {
      setMetrics(newMetrics);
      alertManager.checkAlerts(newMetrics);
    };

    // アラートの更新をリッスン
    const alertListener = (alert: AlertType) => {
      setAlerts(prev => [alert, ...prev]);
    };

    metricsCollector.addListener(metricsListener);
    alertManager.addListener(alertListener);

    return () => {
      metricsCollector.removeListener(metricsListener);
      alertManager.removeListener(alertListener);
    };
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">システムモニタリング</h1>

      {/* メモリ使用量 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>メモリ使用量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(metrics.memory.heapUsed)} / {formatBytes(metrics.memory.heapTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              使用率: {((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* CPU使用率 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>CPU使用率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cpu.percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              User: {formatNumber(metrics.cpu.user)}, System: {formatNumber(metrics.cpu.system)}
            </div>
          </CardContent>
        </Card>

        {/* リクエスト統計 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>リクエスト統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.requests.total}
            </div>
            <div className="text-sm text-muted-foreground">
              成功: {metrics.requests.success}, 失敗: {metrics.requests.failed}
              <br />
              平均レイテンシー: {metrics.requests.latency.toFixed(2)}ms
            </div>
          </CardContent>
        </Card>

        {/* 翻訳統計 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>翻訳統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.translations.total}
            </div>
            <div className="text-sm text-muted-foreground">
              成功: {metrics.translations.success}, 失敗: {metrics.translations.failed}
              <br />
              平均処理時間: {metrics.translations.averageProcessingTime.toFixed(2)}ms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* アラート一覧 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">アラート</h2>
        <div className="space-y-4">
          {alerts.map(alert => (
            <Alert
              key={alert.id}
              variant={alert.severity === 'error' || alert.severity === 'critical' ? 'destructive' : 'default'}
            >
              <AlertTitle className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  alert.severity === 'critical' ? 'bg-red-600' :
                  alert.severity === 'error' ? 'bg-red-500' :
                  alert.severity === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                {alert.message}
              </AlertTitle>
              <AlertDescription>
                {new Date(alert.timestamp).toLocaleString()}
              </AlertDescription>
            </Alert>
          ))}
          {alerts.length === 0 && (
            <div className="text-center text-muted-foreground">
              アクティブなアラートはありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 