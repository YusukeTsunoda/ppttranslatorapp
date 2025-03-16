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
  Activity,
  LogIn,
  LogOut,
  UserPlus2,
  Users,
  UserMinus,
  UserCog,
  Key,
  Trash2,
  FileSearch,
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
  sign_in: LogIn,
  sign_up: UserPlus2,
  sign_out: LogOut,
  create_team: Users,
  accept_invitation: UserPlus,
  invite_team_member: UserPlus,
  remove_team_member: UserMinus,
  update_account: UserCog,
  update_password: Key,
  delete_account: Trash2,
  file_upload: FileUp,
  translation: Languages,
  download: Download,
  settings_change: Settings,
  member_invite: UserPlus,
  file_access: FileSearch,
};

const actionLabels = {
  sign_in: 'ログイン',
  sign_up: '新規登録',
  sign_out: 'ログアウト',
  create_team: 'チーム作成',
  accept_invitation: '招待承認',
  invite_team_member: 'メンバー招待',
  remove_team_member: 'メンバー削除',
  update_account: 'アカウント更新',
  update_password: 'パスワード更新',
  delete_account: 'アカウント削除',
  file_upload: 'ファイルアップロード',
  translation: '翻訳',
  download: 'ダウンロード',
  settings_change: '設定変更',
  member_invite: 'メンバー招待',
  file_access: 'ファイルアクセス',
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

  const renderMetadata = () => {
    if (!log.metadata) return null;
    
    if (log.action === 'file_upload' || log.action === 'file_access') {
      const fileName = log.metadata.fileName || '';
      const pageCount = log.metadata.pageCount || 0;
      const translatedPages = log.metadata.translatedPages || [];
      
      return (
        <span className="ml-1 text-gray-600">
          {fileName && <span className="font-medium">{fileName}</span>}
          {pageCount > 0 && <span className="ml-1">({pageCount}ページ)</span>}
          {translatedPages.length > 0 && (
            <span className="ml-1">翻訳済み: {translatedPages.join(', ')}</span>
          )}
        </span>
      );
    }
    
    if (log.action === 'translation') {
      const fileName = log.metadata.fileName || '';
      const sourceLang = log.metadata.sourceLang || '';
      const targetLang = log.metadata.targetLang || '';
      
      return (
        <span className="ml-1 text-gray-600">
          {fileName && <span className="font-medium">{fileName}</span>}
          {sourceLang && targetLang && (
            <span className="ml-1">({sourceLang} → {targetLang})</span>
          )}
        </span>
      );
    }
    
    return (
      <span className="ml-1 text-gray-400 text-xs">
        {Object.entries(log.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')}
      </span>
    );
  };

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
          {renderMetadata()}
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