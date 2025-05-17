// テスト全体で使用するモックの設定
import { prismaMock, sessionMock } from '../helpers/mockSetup';

// Prisma Clientのモック
jest.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

// Next Authのモック
jest.mock('next-auth', () => ({
  ...jest.requireActual('next-auth'),
  getServerSession: sessionMock,
}));

// Next/Serverのモック
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      json: jest.fn((data, options = {}) => ({
        json: () => Promise.resolve(data),
        status: options.status || 200,
        headers: new Headers(),
      })),
      redirect: jest.fn((url) => ({ url })),
      next: jest.fn(() => ({ status: 200 })),
    },
  };
});

// SWRのモック
jest.mock('swr', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      data: null,
      error: null,
      isLoading: false,
      mutate: jest.fn(),
    })),
  };
});

// fs/promisesのモック
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

// fsのモック
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
}));

// useToast関数のモック
jest.mock('@/components/ui/use-toast', () => {
  // モック用の状態管理
  const mockToastsState: { toasts: any[] } = { toasts: [] };

  // トースト追加関数
  const mockToastFn = jest.fn().mockImplementation((props: Record<string, any>) => {
    const id = `toast-${Date.now()}`;
    const newToast = { id, ...props, open: true };
    mockToastsState.toasts.push(newToast);

    return {
      id,
      dismiss: jest.fn(),
      update: jest.fn(),
    };
  });

  // dismiss関数
  const mockDismissFn = jest.fn();

  return {
    useToast: jest.fn().mockImplementation(() => {
      // 各テスト実行時にリセット
      mockToastsState.toasts = [];
      
      return {
        toasts: mockToastsState.toasts,
        toast: mockToastFn,
        dismiss: mockDismissFn,
      };
    }),
    toast: mockToastFn,
    reducer: jest.fn(),
  };
});

// グローバルのfetchモック
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
  }),
) as jest.Mock;

// モックファイル作成ヘルパー
const createMockFile = (name: string, size: number, type: string, lastModified = new Date()): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'lastModified', { value: lastModified.getTime() });
  return file;
};

// グローバルに追加
(global as any).mockFile = createMockFile;
