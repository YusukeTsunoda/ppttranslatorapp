# 開発者ガイド

## 目次

1. [セッション管理](#セッション管理)
   - [useAuthフックの使用方法](#useauthフックの使用方法)
   - [セッション状態の監視](#セッション状態の監視)
   - [認証が必要なページの保護](#認証が必要なページの保護)
   - [トークン更新の仕組み](#トークン更新の仕組み)

2. [エラーハンドリング](#エラーハンドリング)
   - [AppErrorクラスの使用方法](#apperrorクラスの使用方法)
   - [エラー作成関数](#エラー作成関数)
   - [エラーハンドリング関数](#エラーハンドリング関数)
   - [エラー表示の統一](#エラー表示の統一)

3. [APIフック](#apiフック)
   - [useApiフックの使用方法](#useapiフックの使用方法)
   - [useApiRequestフックの使用方法](#useapirequestフックの使用方法)
   - [useApiMutationフックの使用方法](#useapimutationフックの使用方法)
   - [カスタムAPIフックの作成](#カスタムapiフックの作成)

4. [テスト](#テスト)
   - [ユニットテストの書き方](#ユニットテストの書き方)
   - [統合テストの書き方](#統合テストの書き方)
   - [E2Eテストの書き方](#e2eテストの書き方)

---

## セッション管理

セッション管理は、`lib/auth/session.tsx`で実装されています。このモジュールは、NextAuth.jsを拡張して、より使いやすいインターフェースを提供します。

### useAuthフックの使用方法

`useAuth`フックは、セッション状態を取得し、認証関連の操作を行うためのインターフェースを提供します。

```tsx
import { useAuth } from '@/lib/auth/session';

function MyComponent() {
  const { 
    isAuthenticated, 
    user, 
    loading, 
    error, 
    login, 
    logout, 
    updateUser, 
    clearError 
  } = useAuth();

  // 認証状態に基づいて表示を切り替える
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name || 'User'}</h1>
      <button onClick={() => logout('/signin')}>Sign out</button>
    </div>
  );
}
```

### セッション状態の監視

セッション状態は、`SessionProvider`コンポーネントによって管理されます。このプロバイダーは、アプリケーションのルートコンポーネントでラップする必要があります。

```tsx
// app/layout.tsx
import { SessionProvider } from '@/lib/auth/session';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 認証が必要なページの保護

認証が必要なページを保護するには、`useAuth`フックを使用して認証状態を確認し、未認証の場合はリダイレクトします。

```tsx
// app/(dashboard)/profile/page.tsx
'use client';

import { useAuth } from '@/lib/auth/session';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // リダイレクト中は何も表示しない
  }

  return (
    <div>
      <h1>Profile Page</h1>
      {/* プロフィールコンテンツ */}
    </div>
  );
}
```

### トークン更新の仕組み

トークンの更新は、NextAuth.jsのJWTコールバックで自動的に処理されます。トークンの有効期限が近づくと、自動的に更新されます。この処理は`lib/auth/auth-options.ts`で設定されています。

```tsx
// lib/auth/auth-options.ts（抜粋）
callbacks: {
  jwt: async ({ token, user }) => {
    // ユーザー情報がある場合はトークンに追加
    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
      token.role = user.role;
      token.userAgent = headers().get('user-agent') || '';
      token.iat = Math.floor(Date.now() / 1000);
      token.exp = Math.floor(Date.now() / 1000) + 60 * 60; // 1時間
    }

    // トークンの有効期限をチェック
    const shouldRefreshToken = token.exp && (token.exp - Math.floor(Date.now() / 1000) < 15 * 60); // 15分未満
    
    if (shouldRefreshToken) {
      try {
        // トークンを更新
        token = await refreshToken(token);
      } catch (error) {
        console.error('Token refresh error:', error);
      }
    }

    return token;
  },
  // ...
}
```

---

## エラーハンドリング

エラーハンドリングは、`lib/utils/error-handler.ts`で実装されています。このモジュールは、統一的なエラー処理を提供します。

### AppErrorクラスの使用方法

`AppError`クラスは、アプリケーション固有のエラーを表現するためのクラスです。

```tsx
import { AppError } from '@/lib/utils/error-handler';

try {
  // 何らかの処理
  if (someCondition) {
    throw new AppError({
      type: 'VALIDATION',
      message: '入力内容に誤りがあります',
      code: 'VALIDATION_ERROR',
      context: { field: 'email', value: 'invalid-email' },
    });
  }
} catch (error) {
  // エラー処理
  console.error('Error:', error);
}
```

### エラー作成関数

エラー作成関数は、特定のタイプのエラーを簡単に作成するためのユーティリティ関数です。

```tsx
import { 
  createAuthError, 
  createValidationError, 
  createNotFoundError, 
  createForbiddenError 
} from '@/lib/utils/error-handler';

// 認証エラー
const authError = createAuthError('認証に失敗しました');

// バリデーションエラー
const validationError = createValidationError('入力内容に誤りがあります', {
  field: 'email',
  value: 'invalid-email',
});

// Not Foundエラー
const notFoundError = createNotFoundError('リソースが見つかりません');

// 権限エラー
const forbiddenError = createForbiddenError();
```

### エラーハンドリング関数

エラーハンドリング関数は、エラーを適切に処理し、ユーザーに通知するためのユーティリティ関数です。

```tsx
import { handleClientError, handleApiError } from '@/lib/utils/error-handler';

// クライアント側のエラーハンドリング
try {
  // 何らかの処理
} catch (error) {
  handleClientError(error, 'デフォルトのエラーメッセージ');
}

// API側のエラーハンドリング
try {
  // 何らかの処理
} catch (error) {
  const errorResponse = handleApiError(error);
  return NextResponse.json(errorResponse, { status: errorResponse.status });
}
```

### エラー表示の統一

エラーは、トーストコンポーネントを使用して統一的に表示されます。

```tsx
import { toast } from '@/components/ui/use-toast';

// エラーの表示
toast({
  title: 'エラー',
  description: 'エラーメッセージ',
  variant: 'destructive',
});

// 成功の表示
toast({
  title: '成功',
  description: '処理が完了しました',
});
```

---

## APIフック

APIフックは、`lib/hooks/use-api.ts`で実装されています。このモジュールは、SWRを使用して、APIリクエストを簡単に行うためのフックを提供します。

### useApiフックの使用方法

`useApi`フックは、APIエンドポイントからデータを取得するためのフックです。

```tsx
import { useApi } from '@/lib/hooks/use-api';

function UserProfile() {
  const { data, error, isLoading } = useApi('/api/profile', async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

### useApiRequestフックの使用方法

`useApiRequest`フックは、APIリクエストを送信するためのフックです。

```tsx
import { useApiRequest } from '@/lib/hooks/use-api';

function UserList() {
  const { data, error, isLoading } = useApiRequest('/api/users');

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <ul>
      {data.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### useApiMutationフックの使用方法

`useApiMutation`フックは、APIミューテーション（データの作成、更新、削除）を行うためのフックです。

```tsx
import { useApiMutation } from '@/lib/hooks/use-api';

function UpdateProfile() {
  const { mutate, isLoading, error } = useApiMutation('/api/profile/update');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    await mutate(data, {
      onSuccess: (data) => {
        toast({
          title: '成功',
          description: 'プロフィールを更新しました',
        });
      },
      onError: (error) => {
        toast({
          title: 'エラー',
          description: error.message || 'プロフィールの更新に失敗しました',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" placeholder="Name" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Profile'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}
```

### カスタムAPIフックの作成

特定のAPIエンドポイントに対するカスタムフックを作成することで、コードの再利用性を高めることができます。

```tsx
// lib/hooks/use-profile.ts
import { useApiRequest, useApiMutation } from '@/lib/hooks/use-api';

export function useProfile() {
  return useApiRequest('/api/profile');
}

export function useUpdateProfile() {
  return useApiMutation('/api/profile/update');
}

// 使用例
function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isLoading: isUpdating } = useUpdateProfile();

  // ...
}
```

---

## テスト

テストは、Jest、React Testing Library、Cypressを使用して実装されています。

### ユニットテストの書き方

ユニットテストは、個々のコンポーネントや関数の動作を検証するためのテストです。

```tsx
// tests/utils/error-handler.test.ts
import {
  createAuthError,
  createValidationError,
  AppError,
} from '@/lib/utils/error-handler';

describe('エラーハンドリングユーティリティ', () => {
  describe('エラー作成関数', () => {
    it('認証エラーを正しく作成する', () => {
      const error = createAuthError('認証に失敗しました');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('AUTH');
      expect(error.message).toBe('認証に失敗しました');
    });

    it('バリデーションエラーを正しく作成する', () => {
      const context = { field: 'email', message: '有効なメールアドレスを入力してください' };
      const error = createValidationError('入力内容に誤りがあります', context);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('VALIDATION');
      expect(error.message).toBe('入力内容に誤りがあります');
      expect(error.context).toEqual(context);
    });
  });
});
```

### 統合テストの書き方

統合テストは、複数のコンポーネントや機能が連携して動作することを検証するためのテストです。

```tsx
// tests/auth/session.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuth, SessionProvider } from '@/lib/auth/session';

describe('セッション管理', () => {
  describe('useAuth', () => {
    it('認証状態を正しく返す', () => {
      const wrapper = ({ children }) => (
        <SessionProvider>{children}</SessionProvider>
      );
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeUndefined();
    });
  });
});
```

### E2Eテストの書き方

E2Eテストは、ユーザーの視点からアプリケーション全体の動作を検証するためのテストです。

```tsx
// cypress/e2e/auth.cy.ts
describe('認証フロー', () => {
  beforeEach(() => {
    cy.clearCookies();
  });

  it('ログインページにアクセスできる', () => {
    cy.visit('/signin');
    cy.contains('サインイン').should('be.visible');
  });

  it('無効な認証情報でログインに失敗する', () => {
    cy.visit('/signin');
    cy.get('input[name="email"]').type('invalid@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('認証に失敗しました').should('be.visible');
  });

  it('有効な認証情報でログインに成功する', () => {
    cy.visit('/signin');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
});
``` 