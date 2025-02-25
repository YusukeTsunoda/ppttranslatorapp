/**
 * ログレベルの定義
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 基本的なログメッセージの型定義
 */
export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * エラーログの型定義
 */
export interface ErrorLog extends LogMessage {
  level: Extract<LogLevel, 'error' | 'fatal'>;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    action?: string;
    component?: string;
    path?: string;
  };
}

/**
 * セッションログの型定義
 */
export interface SessionLog extends LogMessage {
  sessionId: string;
  action: 'created' | 'refreshed' | 'expired' | 'destroyed';
  expiresAt: string;
}

/**
 * 監査ログの型定義
 */
export interface AuditLog extends LogMessage {
  action: string;
  resource: string;
  ipAddress: string;
  userAgent?: string;
} 