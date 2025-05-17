import os from 'os';
import { prisma } from '../prisma';
import { PerformanceMetrics } from '@/lib/translation/performance';

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: {
    bytesIn: number;
    bytesOut: number;
  };
}

export class MetricsCollector {
  private static instance: MetricsCollector;

  private constructor() {}

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();
    const networkTraffic = await this.getNetworkTraffic();

    return {
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkTraffic,
    };
  }

  private async getCPUUsage(): Promise<number> {
    const cpus = os.cpus();
    const totalCPU = cpus.reduce((acc, cpu) => {
      acc.idle += cpu.times.idle;
      acc.total += Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return acc;
    }, { idle: 0, total: 0 });

    return ((1 - totalCPU.idle / totalCPU.total) * 100);
  }

  private getMemoryUsage(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return ((totalMem - freeMem) / totalMem * 100);
  }

  private async getDiskUsage(): Promise<number> {
    // 実装例: df コマンドを使用してディスク使用率を取得
    return new Promise((resolve) => {
      resolve(0); // 実際の実装では df コマンドの結果を解析
    });
  }

  private async getNetworkTraffic(): Promise<{ bytesIn: number; bytesOut: number }> {
    // 実装例: /proc/net/dev または netstat の結果を解析
    return {
      bytesIn: 0,
      bytesOut: 0,
    };
  }
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: SystemMetrics;
  private listeners: ((metrics: SystemMetrics) => void)[] = [];

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.startCollecting();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeMetrics(): SystemMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkTraffic: {
        bytesIn: 0,
        bytesOut: 0,
      },
    };
  }

  private startCollecting(): void {
    setInterval(() => {
      this.collectSystemMetrics();
      this.notifyListeners();
    }, 5000); // 5秒ごとに収集
  }

  private collectSystemMetrics(): void {
    this.collectSystemMetrics().then(metrics => {
      this.metrics = metrics;
    });
  }

  recordRequest(success: boolean, latency: number): void {
    // Implementation needed
  }

  recordTranslation(success: boolean, processingTime: number): void {
    // Implementation needed
  }

  recordCacheOperation(hit: boolean, size: number): void {
    // Implementation needed
  }

  addListener(listener: (metrics: SystemMetrics) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (metrics: SystemMetrics) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.metrics));
  }

  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }
}

export const metricsCollector = MetricsCollector.getInstance(); 