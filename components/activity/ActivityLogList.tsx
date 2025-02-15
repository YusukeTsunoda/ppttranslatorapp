import { memo } from 'react';
import { ActivityAction } from '@/lib/utils/activity-logger';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  FileUp,
  Download,
  Settings,
  UserPlus,
  Languages,
  Activity
} from 'lucide-react';

interface ActivityLogItem {
  id: string;
  action: ActivityAction;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
  metadata?: Record<string, any> | null;
}

const actionIcons = {
  file_upload: FileUp,
  translation: Languages,
  download: Download,
  settings_change: Settings,
  member_invite: UserPlus,
};

const actionLabels = {
  file_upload: 'ファイルアップロード',
  translation: '翻訳',
  download: 'ダウンロード',
  settings_change: '設定変更',
  member_invite: 'メンバー招待',
};

interface ActivityLogListProps {
  logs: ActivityLogItem[];
}

const ActivityLogItemComponent = memo(({ log }: { log: ActivityLogItem }) => {
  const Icon = actionIcons[log.action];
  const label = actionLabels[log.action];
  const timeAgo = formatDistanceToNow(new Date(log.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-shrink-0">
        <Icon className="h-5 w-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {log.user.name || log.user.email}
        </p>
        <p className="text-sm text-gray-500">
          {label}
          {log.metadata && (
            <span className="ml-1 text-gray-400">
              {JSON.stringify(log.metadata)}
            </span>
          )}
        </p>
      </div>
      <div className="flex-shrink-0">
        <p className="text-sm text-gray-500">{timeAgo}</p>
      </div>
    </div>
  );
});

ActivityLogItemComponent.displayName = 'ActivityLogItem';

export const ActivityLogList = memo(({ logs }: ActivityLogListProps) => {
  if (!logs?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-4" />
        <p>アクティビティログはまだありません</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {logs.map((log) => (
        <ActivityLogItemComponent key={log.id} log={log} />
      ))}
    </div>
  );
});

ActivityLogList.displayName = 'ActivityLogList'; 