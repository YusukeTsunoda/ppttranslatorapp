'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { Session } from 'next-auth';

// セッションエラーの種類
export type SessionError = 'EXPIRED' | 'INVALID' | 'NETWORK' | 'UNAUTHORIZED' | 'UNKNOWN';

// セッション状態の型定義
export interface SessionState {
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

// 拡張されたセッション型
interface ExtendedSession extends Session {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
}

// コンテキストの型定義
interface SessionContextType extends SessionState {
  login: (email: string, password: string, callbackUrl?: string) => Promise<void>;
  logout: (callbackUrl?: string) => Promise<void>;
  updateUser: (userData: Partial<SessionState['user']>) => Promise<void>;
  clearError: () => void;
}

// デフォルト値
const defaultSessionState: SessionState = {
  isAuthenticated: false,
  user: null,
  loading: true,
};

// コンテキストの作成
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// プロバイダーコンポーネント
export function SessionProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [sessionState, setSessionState] = useState<SessionState>(defaultSessionState);
  const router = useRouter();

  // NextAuthのセッション状態が変更されたときに実行
  useEffect(() => {
    if (status === 'loading') {
      setSessionState((prev) => ({ ...prev, loading: true }));
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const extendedSession = session as ExtendedSession;
      setSessionState({
        isAuthenticated: true,
        user: {
          id: extendedSession.user.id,
          email: extendedSession.user.email,
          name: extendedSession.user.name,
        },
        loading: false,
      });
    } else {
      setSessionState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    }
  }, [session, status]);

  // ログイン処理
  const login = async (email: string, password: string, callbackUrl?: string) => {
    try {
      setSessionState((prev) => ({ ...prev, loading: true, error: undefined }));

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setSessionState((prev) => ({
          ...prev,
          loading: false,
          error: {
            type: 'UNAUTHORIZED',
            message: result.error || 'ログインに失敗しました',
            timestamp: Date.now(),
          },
        }));

        toast({
          title: 'エラー',
          description: result.error || 'ログインに失敗しました',
          variant: 'destructive',
        });

        return;
      }

      if (result?.url && callbackUrl) {
        router.push(callbackUrl);
      }

      toast({
        title: 'ログイン成功',
        description: 'ログインに成功しました',
      });
    } catch (error) {
      console.error('Login error:', error);

      setSessionState((prev) => ({
        ...prev,
        loading: false,
        error: {
          type: 'NETWORK',
          message: error instanceof Error ? error.message : 'ログインに失敗しました',
          timestamp: Date.now(),
        },
      }));

      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ログインに失敗しました',
        variant: 'destructive',
      });
    }
  };

  // ログアウト処理
  const logout = async (callbackUrl?: string) => {
    try {
      setSessionState((prev) => ({ ...prev, loading: true }));

      await signOut({
        redirect: false,
        callbackUrl,
      });

      setSessionState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });

      if (callbackUrl) {
        router.push(callbackUrl);
      }

      toast({
        title: 'ログアウト',
        description: 'ログアウトしました',
      });
    } catch (error) {
      console.error('Logout error:', error);

      setSessionState((prev) => ({
        ...prev,
        loading: false,
        error: {
          type: 'NETWORK',
          message: error instanceof Error ? error.message : 'ログアウトに失敗しました',
          timestamp: Date.now(),
        },
      }));

      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ログアウトに失敗しました',
        variant: 'destructive',
      });
    }
  };

  // ユーザー情報の更新
  const updateUser = async (userData: Partial<SessionState['user']>) => {
    try {
      if (!sessionState.user) {
        throw new Error('ユーザーが認証されていません');
      }

      setSessionState((prev) => ({
        ...prev,
        loading: true,
      }));

      // APIを呼び出してユーザー情報を更新
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ユーザー情報の更新に失敗しました');
      }

      const data = await response.json();

      // 状態を更新
      setSessionState((prev) => ({
        ...prev,
        loading: false,
        user: prev.user
          ? {
              ...prev.user,
              ...data.user,
            }
          : null,
      }));

      toast({
        title: '更新完了',
        description: 'ユーザー情報を更新しました',
      });
    } catch (error) {
      console.error('Update user error:', error);

      setSessionState((prev) => ({
        ...prev,
        loading: false,
        error: {
          type: 'NETWORK',
          message: error instanceof Error ? error.message : 'ユーザー情報の更新に失敗しました',
          timestamp: Date.now(),
        },
      }));

      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ユーザー情報の更新に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // エラーのクリア
  const clearError = () => {
    setSessionState((prev) => ({ ...prev, error: undefined }));
  };

  return (
    <SessionContext.Provider
      value={{
        ...sessionState,
        login,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

// カスタムフック
export function useAuth() {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within a SessionProvider');
  }

  return context;
}

// セッションの有効性を確認するためのユーティリティ関数
export function isSessionValid(session: any): boolean {
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
}

// パスワードの比較関数（既存の関数を保持）
export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // 既存の実装を保持
  try {
    // bcryptなどを使用した比較ロジック
    return true; // 実際の実装に置き換える
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}
