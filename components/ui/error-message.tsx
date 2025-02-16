import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ErrorCodes, type ErrorCode } from '@/lib/utils/error-handler';

interface ErrorMessageProps {
  title?: string;
  message: string;
  code?: ErrorCode;
  className?: string;
}

const errorIcons = {
  [ErrorCodes.UNAUTHORIZED]: AlertCircle,
  [ErrorCodes.FORBIDDEN]: XCircle,
  [ErrorCodes.NOT_FOUND]: Info,
  [ErrorCodes.VALIDATION_ERROR]: AlertTriangle,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: AlertTriangle,
  [ErrorCodes.DATABASE_ERROR]: XCircle,
  [ErrorCodes.API_ERROR]: XCircle,
  [ErrorCodes.NETWORK_ERROR]: AlertCircle,
  [ErrorCodes.UNKNOWN_ERROR]: XCircle,
} as const;

const errorTitles = {
  [ErrorCodes.UNAUTHORIZED]: '認証エラー',
  [ErrorCodes.FORBIDDEN]: '権限エラー',
  [ErrorCodes.NOT_FOUND]: '未検出エラー',
  [ErrorCodes.VALIDATION_ERROR]: '入力エラー',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'レート制限エラー',
  [ErrorCodes.DATABASE_ERROR]: 'データベースエラー',
  [ErrorCodes.API_ERROR]: 'APIエラー',
  [ErrorCodes.NETWORK_ERROR]: 'ネットワークエラー',
  [ErrorCodes.UNKNOWN_ERROR]: 'エラー',
} as const;

const errorVariants = {
  [ErrorCodes.UNAUTHORIZED]: 'destructive',
  [ErrorCodes.FORBIDDEN]: 'destructive',
  [ErrorCodes.NOT_FOUND]: 'default',
  [ErrorCodes.VALIDATION_ERROR]: 'default',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'default',
  [ErrorCodes.DATABASE_ERROR]: 'destructive',
  [ErrorCodes.API_ERROR]: 'destructive',
  [ErrorCodes.NETWORK_ERROR]: 'destructive',
  [ErrorCodes.UNKNOWN_ERROR]: 'destructive',
} as const;

export function ErrorMessage({
  title,
  message,
  code = ErrorCodes.UNKNOWN_ERROR,
  className,
}: ErrorMessageProps) {
  const Icon = errorIcons[code];
  const defaultTitle = errorTitles[code];
  const variant = errorVariants[code];

  return (
    <Alert variant={variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title || defaultTitle}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
} 