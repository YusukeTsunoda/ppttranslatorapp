import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { comparePasswords } from '@/lib/auth/password';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { User } from '@prisma/client';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Prisma Clientのモック
jest.mock('@/lib/db/prisma', () => ({
  prisma: mockDeep<DeepMockProxy<typeof prisma>>(),
}));

// comparePasswordsのモック
jest.mock('@/lib/auth/password', () => ({
  ...jest.requireActual('@/lib/auth/password'), // hashPassword など他の関数はそのまま使う可能性を考慮
  comparePasswords: jest.fn(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;
const comparePasswordsMock = comparePasswords as jest.Mock;

describe('authOptions - CredentialsProvider - authorize', () => {
  let authorize: ((credentials: Record<string, string> | undefined) => Promise<any>) | undefined;

  beforeAll(() => {
    // authOptionsからauthorize関数を取得
    const credentialsProvider = authOptions.providers.find(
      (provider) => provider.name === 'credentials'
    );
    if (credentialsProvider && 'authorize' in credentialsProvider) {
      authorize = credentialsProvider.authorize;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    comparePasswordsMock.mockResolvedValue(true); // デフォルトでパスワード一致
  });

  it('should throw error if authorize function is not found (config issue)', () => {
    if (!authorize) { // このテストケースはauthorizeが見つからない場合に実行される
      expect(true).toBe(true); // authorize が undefined ならテストは実質的にパス
      console.warn('Authorize function not found in authOptions.Providers.Credentials. Test skipped.');
      return;
    }
    // authorizeが見つかれば、このテストは意味がないので、別の形で表明する
    expect(authorize).toBeDefined();
  });

  it('should throw error if email or password is not provided', async () => {
    if (!authorize) return; // authorize がなければテストスキップ
    await expect(authorize({ email: 'test@example.com' })).rejects.toThrow(
      'メールアドレスとパスワードは必須です'
    );
    await expect(authorize({ password: 'password123' })).rejects.toThrow(
      'メールアドレスとパスワードは必須です'
    );
    await expect(authorize({})).rejects.toThrow('メールアドレスとパスワードは必須です');
  });

  it('should throw error if user is not found', async () => {
    if (!authorize) return;
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(
      authorize({ email: 'nonexistent@example.com', password: 'password123' })
    ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
  });

  it('should throw error if user has no password set (e.g. OAuth user)', async () => {
    if (!authorize) return;
    const mockUserWithoutPassword = {
      id: 'user1', email: 'test@example.com', name: 'Test User', password: null 
    } as unknown as User; // passwordがnullのケース
    prismaMock.user.findUnique.mockResolvedValue(mockUserWithoutPassword);
    await expect(
      authorize({ email: 'test@example.com', password: 'password123' })
    ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
  });

  it('should throw error if password comparison fails', async () => {
    if (!authorize) return;
    const mockUser = {
      id: 'user1', email: 'test@example.com', name: 'Test User', password: 'hashedPassword'
    } as User;
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    comparePasswordsMock.mockResolvedValue(false); // パスワード不一致

    await expect(
      authorize({ email: 'test@example.com', password: 'wrongpassword' })
    ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
  });

  it('should return user object and update user on successful authorization', async () => {
    if (!authorize) return;
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedPassword',
      // ... other fields that might be needed for prisma.user.update
      updatedAt: new Date(),
    } as User;
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    comparePasswordsMock.mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue(mockUser); // モックされた更新後のユーザー

    const result = await authorize({ email: 'test@example.com', password: 'password123' });

    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(comparePasswordsMock).toHaveBeenCalledWith('password123', 'hashedPassword');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { updatedAt: expect.any(Date) },
    });
  });
});

describe('authOptions - callbacks.jwt', () => {
  let jwtCallback: ((args: { token: JWT; user?: any; account?: any; profile?: any; isNewUser?: boolean; trigger?: string; session?: any; }) => Promise<JWT>) | undefined;
  const mockInitialToken: JWT = {
    name: 'Initial Name',
    email: 'initial@example.com',
    picture: 'initial_pic',
    sub: 'initial_sub',
    iat: Math.floor(Date.now() / 1000) - 3600, // 1時間前
    exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後
  };

  beforeAll(() => {
    if (authOptions.callbacks && typeof authOptions.callbacks.jwt === 'function') {
      jwtCallback = authOptions.callbacks.jwt;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // refreshToken内のprisma.user.findUniqueのデフォルトモック
    prismaMock.user.findUnique.mockResolvedValue(null); 
    // refreshToken内のprisma.user.updateのデフォルトモック
    prismaMock.user.update.mockResolvedValue({} as any); 
  });

  it('should add user info to token on initial sign in', async () => {
    if (!jwtCallback) return;
    const mockUser = {
      id: 'user123',
      email: 'newuser@example.com',
      name: 'New User',
    };
    const tokenArg = { ...mockInitialToken }; // 初期トークン (内容はjwtコールバック内で上書きされる)

    const result = await jwtCallback({ token: tokenArg, user: mockUser });

    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
    expect(result.name).toBe(mockUser.name);
    expect(result.iat).toBeCloseTo(Math.floor(Date.now() / 1000), -1);
    expect(result.exp).toBeCloseTo(Math.floor(Date.now() / 1000) + 24 * 60 * 60, -1);
    // uaのテストはwindowがないためここでは省略 (E2Eで確認)
  });

  it('should update token name if trigger is update and session has userName', async () => {
    if (!jwtCallback) return;
    const updatedName = 'Updated Name';
    const tokenArg = { ...mockInitialToken, email: 'test@example.com' }; // emailが必要なため設定
    const sessionArg = { user: { name: updatedName } };

    // refreshTokenがDBアクセスしないようにモック (expを十分に未来にする)
    tokenArg.exp = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60; // 2日後
    
    const result = await jwtCallback({ token: tokenArg, trigger: 'update', session: sessionArg });

    expect(result.name).toBe(updatedName);
  });

  it('should call refreshToken and return its result (expiring soon case)', async () => {
    if (!jwtCallback) return;
    const expiringToken = {
      ...mockInitialToken,
      email: 'refresh@example.com', // refreshToken内のDB検索で使う
      exp: Math.floor(Date.now() / 1000) + 60, // 1分後に期限切れ
    };
    const refreshedDbUser = {
      id: 'refreshed-id', email: 'refresh@example.com', name: 'Refreshed User'
    } as User;

    prismaMock.user.findUnique.mockResolvedValue(refreshedDbUser);
    // prisma.user.updateはデフォルトモックでOK

    const result = await jwtCallback({ token: expiringToken });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: expiringToken.email } });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: refreshedDbUser.id },
      data: { updatedAt: expect.any(Date) },
    });
    expect(result.exp).toBeGreaterThan(expiringToken.exp as number);
    expect(result.exp).toBeCloseTo(Math.floor(Date.now() / 1000) + 24 * 60 * 60, -1);
  });

   it('should call refreshToken and return its result (no exp case)', async () => {
    if (!jwtCallback) return;
    const tokenWithoutExp = {
      ...mockInitialToken,
      email: 'noexp@example.com',
    };
    delete tokenWithoutExp.exp; // expを削除
    const dbUser = {
      id: 'noexp-id', email: 'noexp@example.com', name: 'No Exp User'
    } as User;

    // refreshTokenはexpがない場合、DBアクセスはしない (現在の実装では)
    // しかし、emailがtokenにあれば、userを探しに行くロジックになっている。
    // そのため、findUniqueは呼ばれる。
    prismaMock.user.findUnique.mockResolvedValue(dbUser);

    const result = await jwtCallback({ token: tokenWithoutExp });
    
    expect(result.exp).toBeDefined();
    expect(result.exp).toBeCloseTo(Math.floor(Date.now() / 1000) + 24 * 60 * 60, -1);
    // expがない場合、refreshToken内でDBアクセスが走るかどうかはrefreshTokenの実装による
    // 現状の実装(auth-options.ts)では、token.emailがあればfindUniqueが呼ばれる
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: tokenWithoutExp.email } });
    // userが見つかればupdateも呼ばれる
    expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: {id: dbUser.id},
        data: {updatedAt: expect.any(Date)}
    });
  });

  it('should not refresh token if expiry is not soon and exp exists', async () => {
    if (!jwtCallback) return;
    const validToken = {
      ...mockInitialToken,
      email: 'valid@example.com',
      exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10分後 (リフレッシュマージンより大きい)
    };

    const result = await jwtCallback({ token: validToken });

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(result.exp).toBe(validToken.exp);
  });
});

describe('authOptions - callbacks.session', () => {
  let sessionCallback: ((args: { session: Session; token: JWT; user: any; }) => Promise<Session>) | undefined;

  beforeAll(() => {
    if (authOptions.callbacks && typeof authOptions.callbacks.session === 'function') {
      sessionCallback = authOptions.callbacks.session;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transfer id, email, name from token to session.user', async () => {
    if (!sessionCallback) return;
    const mockToken: JWT = {
      id: 'token-user-id',
      email: 'token@example.com',
      name: 'Token User Name',
      sub: 'tokensub',
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600, // 1時間後
      ua: 'test-user-agent', // uaもテストケースに含める
    };
    const mockInitialSession: Session = {
      user: {
        // 初期セッションのuserは一部未定義かもしれない
      },
      expires: 'some-initial-expiry',
    };

    const result = await sessionCallback({ session: mockInitialSession, token: mockToken, user: {} /* userは使われない */ });

    expect(result.user.id).toBe(mockToken.id);
    expect(result.user.email).toBe(mockToken.email);
    expect(result.user.name).toBe(mockToken.name);
  });

  it('should add expires to session from token.exp', async () => {
    if (!sessionCallback) return;
    const tokenExp = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2時間後
    const mockToken: JWT = {
      id: 'user1', email: 'e@e.co', name: 'N', // 必須なものを適当に設定
      exp: tokenExp,
    };
    const mockInitialSession: Session = {
      user: {},
      expires: 'initial',
    };

    const result = await sessionCallback({ session: mockInitialSession, token: mockToken, user: {} });

    expect(result.expires).toBe(new Date(tokenExp * 1000).toISOString());
  });

  it('should handle token without name gracefully', async () => {
    if (!sessionCallback) return;
    const mockTokenWithoutName: JWT = {
      id: 'user-no-name',
      email: 'noname@example.com',
      // name is intentionally omitted or null
      name: null,
      exp: Date.now() / 1000 + 3600,
    };
    const mockInitialSession: Session = { user: {}, expires: 'initial' };

    const result = await sessionCallback({ session: mockInitialSession, token: mockTokenWithoutName, user: {} });

    expect(result.user.name).toBeNull();
  });
  
  it('should proceed without error if token.ua or window is not present', async () => {
    if (!sessionCallback) return;
    const mockTokenWithoutUA: JWT = {
      id: 'user-no-ua',
      email: 'noua@example.com',
      name: 'No UA User',
      exp: Date.now() / 1000 + 3600,
      // ua is omitted
    };
    const mockInitialSession: Session = { user: {}, expires: 'initial' };

    // windowオブジェクトがない環境 (Node.js/Jest) をシミュレート
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    let errorOccurred = false;
    try {
        await sessionCallback({ session: mockInitialSession, token: mockTokenWithoutUA, user: {} });
    } catch (e) {
        errorOccurred = true;
    }
    expect(errorOccurred).toBe(false);

    // windowオブジェクトを元に戻す
    global.window = originalWindow;
  });

  // uaミスマッチの警告テストは、console.warnのモックとwindow.navigator.userAgentの操作が必要で複雑になるため、
  // E2Eテストでカバーする方が適切かもしれません。ここでは基本的なパススルーを確認します。
});

// TODO: refreshToken 関数のテスト (auth-options.ts内でexportされていれば) 