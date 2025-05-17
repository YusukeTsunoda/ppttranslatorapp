import 'next-auth';
import { Session, User } from 'next-auth';

// NextAuthのモック関数の型定義
declare module 'next-auth/react' {
  /**
   * useSessionフックのモック用型定義
   */
  function useSession(): {
    data: Session | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    update: (data?: any) => Promise<Session | null>;
  };

  /**
   * getSessionのモック用型定義
   */
  function getSession(options?: { req?: any }): Promise<Session | null>;

  /**
   * signInのモック用型定義
   */
  function signIn(
    provider?: string,
    options?: { redirect?: boolean; callbackUrl?: string; email?: string; password?: string },
    authorizationParams?: Record<string, string>
  ): Promise<{ error: string | null; status: number; ok: boolean; url: string | null }>;

  /**
   * signOutのモック用型定義
   */
  function signOut(options?: { redirect?: boolean; callbackUrl?: string }): Promise<void>;

  /**
   * getCsrfTokenのモック用型定義
   */
  function getCsrfToken(options?: { req?: any }): Promise<string | null>;

  /**
   * getProviders関数のモック用型定義
   */
  function getProviders(): Promise<Record<string, {
    id: string;
    name: string;
    type: string;
    signinUrl: string;
    callbackUrl: string;
  }>>;
}

// NextAuthのサーバーサイド関数のモック
declare module 'next-auth/jwt' {
  /**
   * getTokenのモック用型定義
   */
  function getToken(options?: { req?: any; raw?: boolean }): Promise<any>;

  /**
   * JWT検証関数のモック用型定義
   */
  function decode(params: { token?: string; secret?: string }): Promise<any>;
}

// NextAuthのNextRequest拡張
declare module 'next/server' {
  interface NextRequest {
    auth?: {
      userId?: string;
      user?: User;
      isAuthenticated: boolean;
    };
  }
}

export {};
