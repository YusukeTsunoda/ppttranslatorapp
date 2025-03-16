import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SessionProvider, useAuth, isSessionValid } from '@/lib/auth/session';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

// モック設定
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn()
}));

// テスト用のコンポーネント
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="auth-status">
        {auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-id">{auth.user?.id || 'no-user'}</div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{auth.error ? auth.error.type : 'no-error'}</div>
      <button data-testid="login-btn" onClick={() => auth.login('test@example.com', 'password')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
      <button data-testid="clear-error-btn" onClick={() => auth.clearError()}>
        Clear Error
      </button>
    </div>
  );
};

describe('認証セッション管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのモック値を設定
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      refresh: jest.fn()
    });
  });

  describe('SessionProvider', () => {
    it('認証されていない状態で正しく初期化される', async () => {
      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      });
    });

    it('認証済みのセッションを正しく処理する', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated'
      });

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
      });
    });

    it('ローディング状態を正しく処理する', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading'
      });

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      });
    });

    it('ログイン処理を正しく実行する', async () => {
      (signIn as jest.Mock).mockResolvedValue({
        ok: true,
        error: null
      });

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      );

      const loginButton = screen.getByTestId('login-btn');
      await act(async () => {
        loginButton.click();
      });

      expect(signIn).toHaveBeenCalledWith('credentials', {
        redirect: false,
        email: 'test@example.com',
        password: 'password'
      });
    });

    it('ログイン失敗時にエラーを設定する', async () => {
      (signIn as jest.Mock).mockResolvedValue({
        ok: false,
        error: 'Invalid credentials'
      });

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      );

      const loginButton = screen.getByTestId('login-btn');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('UNAUTHORIZED');
        expect(toast).toHaveBeenCalled();
      });
    });

    it('ログアウト処理を正しく実行する', async () => {
      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      );

      const logoutButton = screen.getByTestId('logout-btn');
      await act(async () => {
        logoutButton.click();
      });

      expect(signOut).toHaveBeenCalledWith({
        redirect: false
      });
    });

    it('エラークリア機能が正しく動作する', async () => {
      // エラー状態を設定
      (signIn as jest.Mock).mockResolvedValue({
        ok: false,
        error: 'Invalid credentials'
      });

      render(
        <SessionProvider>
          <TestComponent />
        </SessionProvider>
      );

      // ログイン失敗でエラーを発生させる
      const loginButton = screen.getByTestId('login-btn');
      await act(async () => {
        loginButton.click();
      });

      // エラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('UNAUTHORIZED');
      });

      // エラーをクリア
      const clearErrorButton = screen.getByTestId('clear-error-btn');
      await act(async () => {
        clearErrorButton.click();
      });

      // エラーがクリアされたことを確認
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      });
    });
  });

  describe('isSessionValid', () => {
    it('有効なセッションを正しく検証する', () => {
      const validSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      expect(isSessionValid(validSession)).toBe(true);
    });

    it('期限切れのセッションを無効と判定する', () => {
      const expiredSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com'
        },
        expires: new Date(Date.now() - 1000).toISOString()
      };

      expect(isSessionValid(expiredSession)).toBe(false);
    });

    it('ユーザー情報のないセッションを無効と判定する', () => {
      const sessionWithoutUser = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      expect(isSessionValid(sessionWithoutUser)).toBe(false);
    });

    it('nullセッションを無効と判定する', () => {
      expect(isSessionValid(null)).toBe(false);
    });
  });
});
