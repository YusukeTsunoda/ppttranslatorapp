import { useState, useEffect, useCallback } from 'react';

interface MetricsData {
  memory_usage: {
    timestamp: string;
    value: number;
  } | null;
  processing_time: {
    timestamp: string;
    value: number;
  } | null;
  error_rate: {
    timestamp: string;
    value: number;
  } | null;
}

export const useMetricsWebSocket = (url: string) => {
  const [metrics, setMetrics] = useState<MetricsData>({
    memory_usage: null,
    processing_time: null,
    error_rate: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMetrics(prev => ({
            memory_usage: data.memory_usage || prev.memory_usage,
            processing_time: data.processing_time || prev.processing_time,
            error_rate: data.error_rate || prev.error_rate
          }));
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        setError('WebSocket error occurred');
        console.error('WebSocket error:', event);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // 3秒後に再接続を試みる
        setTimeout(() => connect(), 3000);
      };

      return () => {
        ws.close();
      };
    } catch (e) {
      setError('Failed to establish WebSocket connection');
      console.error('Connection error:', e);
      // 3秒後に再接続を試みる
      setTimeout(() => connect(), 3000);
    }
  }, [url]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  const getMetricHistory = useCallback(async (metricType: string) => {
    try {
      const response = await fetch(`/api/metrics/history/${metricType}`);
      const data = await response.json();
      return data.data;
    } catch (e) {
      console.error(`Failed to fetch ${metricType} history:`, e);
      return [];
    }
  }, []);

  return {
    metrics,
    isConnected,
    error,
    getMetricHistory
  };
}; 