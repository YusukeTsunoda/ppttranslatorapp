import { ActivityAction, logActivity, getUserActivityLogs } from '@/lib/utils/activity-logger';

// コンソール出力のモック
const originalConsoleLog = console.log;
console.log = jest.fn();

describe('アクティビティログユーティリティ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // テスト後にコンソール関数を元に戻す
    console.log = originalConsoleLog;
  });

  describe('logActivity', () => {
    it('有効なデータでログを記録できる', async () => {
      const logData = {
        userId: 'test-user-123',
        action: ActivityAction.sign_in,
        metadata: { ipAddress: '127.0.0.1', device: 'Chrome/Windows' },
      };

      await logActivity(logData);

      expect(console.log).toHaveBeenCalledWith('Activity logged (dummy):', logData);
    });

    it('最小限のデータでログを記録できる', async () => {
      const logData = {
        userId: 'test-user-123',
        action: ActivityAction.file_upload,
      };

      await logActivity(logData);

      expect(console.log).toHaveBeenCalledWith('Activity logged (dummy):', logData);
    });

    it('すべてのアクティビティタイプでログを記録できる', async () => {
      // すべてのActivityActionタイプをテスト
      for (const action of Object.values(ActivityAction)) {
        const logData = {
          userId: 'test-user-123',
          action: action as ActivityAction,
        };

        await logActivity(logData);

        expect(console.log).toHaveBeenCalledWith('Activity logged (dummy):', logData);
      }
    });
  });

  describe('getUserActivityLogs', () => {
    it('特定ユーザーのログを取得できる', async () => {
      const userId = 'test-user-123';
      const result = await getUserActivityLogs(userId);

      expect(console.log).toHaveBeenCalledWith('Get user activity logs (dummy):', { userId, limit: 50, cursor: undefined });
      expect(result).toEqual({ logs: [], nextCursor: undefined });
    });

    it('制限とカーソルを指定してログを取得できる', async () => {
      const userId = 'test-user-123';
      const limit = 10;
      const cursor = 'last-log-id';
      const result = await getUserActivityLogs(userId, limit, cursor);

      expect(console.log).toHaveBeenCalledWith('Get user activity logs (dummy):', { userId, limit, cursor });
      expect(result).toEqual({ logs: [], nextCursor: undefined });
    });
  });
}); 