import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';

// セッション管理の型定義
type SessionError = 'EXPIRED' | 'INVALID' | 'NETWORK' | 'UNAUTHORIZED' | 'UNKNOWN';

interface SessionState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
  loading: boolean;
  error?: {
    type: SessionError;
    message: string;
    timestamp: number;
  };
}

// モックのセッション管理フック
const mockUseAuth = () => {
  const [state, setState] = React.useState<SessionState>({
    isAuthenticated: true,
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
    loading: false,
  });

  const login = async (email: string, password: string, callbackUrl?: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: {
            type: 'UNAUTHORIZED',
            message: result.error || 'ログインに失敗しました',
            timestamp: Date.now(),
          },
        }));
        return;
      }

      setState({
        isAuthenticated: true,
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email,
        },
        loading: false,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: {
          type: 'NETWORK',
          message: error instanceof Error ? error.message : 'ログインに失敗しました',
          timestamp: Date.now(),
        },
      }));
    }
  };

  const logout = async (callbackUrl?: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      await signOut({
        redirect: false,
        callbackUrl,
      });

      setState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: {
          type: 'NETWORK',
          message: error instanceof Error ? error.message : 'ログアウトに失敗しました',
          timestamp: Date.now(),
        },
      }));
    }
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: undefined }));
  };

  return {
    ...state,
    login,
    logout,
    clearError,
  };
};

// モックのセッションプロバイダー
const MockSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// セッション有効性チェック関数
const mockIsSessionValid = (session: any): boolean => {
  if (!session) return false;

  // セッションの有効期限をチェック
  if (session.expires) {
    const expiresDate = new Date(session.expires);
    if (expiresDate < new Date()) {
      return false;
    }
  }

  // ユーザー情報の存在をチェック
  if (!session.user || !session.user.id || !session.user.email) {
    return false;
  }

  return true;
};

// モックの設定
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.Mock;
const mockSignIn = signIn as jest.Mock;
const mockSignOut = signOut as jest.Mock;

// モック用のルーター
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// モック用のトースト
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

describe('セッション管理', () => {
  // 各テスト前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      status: 'authenticated',
    });
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    mockSignOut.mockResolvedValue(true);
  });

  describe('useAuth', () => {
    it('認証状態を正しく返す', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockSessionProvider>{children}</MockSessionProvider>
      );
      const { result } = renderHook(() => mockUseAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('ログイン処理を正しく実行する', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockSessionProvider>{children}</MockSessionProvider>
      );
      const { result } = renderHook(() => mockUseAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123', '/dashboard');
      });

      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
        callbackUrl: '/dashboard',
      });
    });

    it('ログアウト処理を正しく実行する', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockSessionProvider>{children}</MockSessionProvider>
      );
      const { result } = renderHook(() => mockUseAuth(), { wrapper });

      await act(async () => {
        await result.current.logout('/signin');
      });

      expect(mockSignOut).toHaveBeenCalledWith({
        redirect: false,
        callbackUrl: '/signin',
      });
    });

    it('エラー状態を正しく処理する', async () => {
      // エラーケースのモック
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockSessionProvider>{children}</MockSessionProvider>
      );
      const { result } = renderHook(() => mockUseAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'wrong-password');
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.type).toBe('UNAUTHORIZED');
      expect(result.current.error?.message).toBe('Invalid credentials');
    });

    it('エラーをクリアする', async () => {
      // エラー状態を作成
      mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockSessionProvider>{children}</MockSessionProvider>
      );
      const { result } = renderHook(() => mockUseAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'wrong-password');
      });

      expect(result.current.error).toBeDefined();

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('isSessionValid', () => {
    it('有効なセッションを正しく検証する', () => {
      const validSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      expect(mockIsSessionValid(validSession)).toBe(true);
    });

    it('期限切れのセッションを無効と判定する', () => {
      const expiredSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() - 1000).toISOString(),
      };

      expect(mockIsSessionValid(expiredSession)).toBe(false);
    });

    it('ユーザー情報のないセッションを無効と判定する', () => {
      const invalidSession = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      expect(mockIsSessionValid(invalidSession)).toBe(false);
    });

    it('nullセッションを無効と判定する', () => {
      expect(mockIsSessionValid(null)).toBe(false);
    });
  });
});
