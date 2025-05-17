import { SystemMetrics } from './metrics';
import { prisma } from '../prisma';

export interface AlertThresholds {
  cpu: number;
  memory: number;
  disk: number;
  errorRate: number;
}

export interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'error';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  metrics: Partial<SystemMetrics>;
}

export class AlertManager {
  private static instance: AlertManager;
  private thresholds: AlertThresholds = {
    cpu: 80,    // 80%
    memory: 85, // 85%
    disk: 90,   // 90%
    errorRate: 10 // 1分間に10件以上
  };

  private constructor() {}

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  public async checkMetrics(metrics: SystemMetrics): Promise<void> {
    await this.checkCPUUsage(metrics.cpuUsage);
    await this.checkMemoryUsage(metrics.memoryUsage);
    await this.checkDiskUsage(metrics.diskUsage);
  }

  private async checkCPUUsage(cpuUsage: number): Promise<void> {
    if (cpuUsage >= this.thresholds.cpu) {
      await this.createAlert({
        type: 'cpu',
        message: `CPU使用率が閾値を超えています: ${cpuUsage.toFixed(2)}%`,
        severity: cpuUsage >= 90 ? 'critical' : 'warning',
        metrics: { cpuUsage }
      });
    }
  }

  private async checkMemoryUsage(memoryUsage: number): Promise<void> {
    if (memoryUsage >= this.thresholds.memory) {
      await this.createAlert({
        type: 'memory',
        message: `メモリ使用率が閾値を超えています: ${memoryUsage.toFixed(2)}%`,
        severity: memoryUsage >= 95 ? 'critical' : 'warning',
        metrics: { memoryUsage }
      });
    }
  }

  private async checkDiskUsage(diskUsage: number): Promise<void> {
    if (diskUsage >= this.thresholds.disk) {
      await this.createAlert({
        type: 'disk',
        message: `ディスク使用率が閾値を超えています: ${diskUsage.toFixed(2)}%`,
        severity: diskUsage >= 95 ? 'critical' : 'warning',
        metrics: { diskUsage }
      });
    }
  }

  private async createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<void> {
    const newAlert = await prisma.alert.create({
      data: {
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        metrics: alert.metrics as any,
        timestamp: new Date()
      }
    });

    // アラート通知の送信（Slack, メールなど）
    await this.sendNotification(newAlert);
  }

  private async sendNotification(alert: Alert): Promise<void> {
    // Slack通知の実装例
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 [${alert.severity.toUpperCase()}] ${alert.message}`,
            attachments: [{
              fields: [
                { title: 'Type', value: alert.type, short: true },
                { title: 'Severity', value: alert.severity, short: true },
                { title: 'Timestamp', value: alert.timestamp.toISOString(), short: false }
              ]
            }]
          })
        });
      } catch (error) {
        console.error('Slack通知の送信に失敗しました:', error);
      }
    }
  }
} 