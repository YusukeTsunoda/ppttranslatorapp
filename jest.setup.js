// jest.setup.js

// global.fetchのモック (他の設定より先に実行)
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
  }),
);

require('@testing-library/jest-dom');

// SWC関連のエラーを抑制
jest.mock('@next/swc-darwin-arm64', () => ({}), { virtual: true });

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

// next/serverのモック
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options = {}) => ({
      json: () => data,
      status: options.status,
    })),
    redirect: jest.fn((url) => ({ url })),
    next: jest.fn(() => ({ status: 200 })),
  },
}));

// swrのモック
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

// コンソールエラーを抑制（テスト中に意図的なエラーを発生させる場合に便利）
const originalConsoleError = console.error;
console.error = (...args) => {
  // テスト中の意図的なエラーメッセージをスキップ
  if (
    args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
    args[0] === '=== Upload Error ===' ||
    args[0] === 'Database connection error: Error: DB connection error' ||
    args[0] === 'Login error: Error: Unexpected error' ||
    args[0]?.includes?.('Client error: Error: Request failed with status')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// モックファイル作成ヘルパー
global.mockFile = (name, size, type, lastModified = new Date()) => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'lastModified', { value: lastModified.getTime() });
  return file;
};

// useToast関数をモック
jest.mock('@/components/ui/use-toast', () => {
  // モック用の状態管理 - モジュールレベルで定義して全テストで共有
  const mockToastsState = { toasts: [] };

  // トースト追加関数
  const mockToastFn = jest.fn((props) => {
    const id = `toast-${Date.now()}`;
    const newToast = { id, ...props, open: true };
    // 実際にモックステートにトーストを追加
    mockToastsState.toasts.push(newToast);

    return {
      id,
      dismiss: () => {
        const index = mockToastsState.toasts.findIndex((t) => t.id === id);
        if (index !== -1) {
          mockToastsState.toasts[index].open = false;
        }
      },
      update: (updatedProps) => {
        const index = mockToastsState.toasts.findIndex((t) => t.id === id);
        if (index !== -1) {
          mockToastsState.toasts[index] = {
            ...mockToastsState.toasts[index],
            ...updatedProps,
          };
        }
      },
    };
  });

  // dismiss関数（特定のIDまたはすべてのトーストを閉じる）
  const mockDismissFn = jest.fn((id) => {
    if (id) {
      const index = mockToastsState.toasts.findIndex((t) => t.id === id);
      if (index !== -1) {
        mockToastsState.toasts[index].open = false;
      }
    } else {
      // IDがない場合は全てのトーストを閉じる
      mockToastsState.toasts.forEach((t) => {
        t.open = false;
      });
    }
  });

  // テスト間でmockToastsStateをリセットする関数
  const resetMockState = () => {
    mockToastsState.toasts = [];
  };

  // モックの外部でbeforeEachを使用するのではなく、モックの内部でリセット関数を返す
  return {
    useToast: jest.fn().mockImplementation(() => {
      // 各テスト実行時にリセット
      resetMockState();
      
      return {
        toasts: mockToastsState.toasts,
        toast: mockToastFn,
        dismiss: mockDismissFn,
      };
    }),
    toast: mockToastFn,
    reducer: jest.fn().mockImplementation((state, action) => {
      switch (action.type) {
        case 'ADD_TOAST':
          return { ...state, toasts: [...state.toasts, action.toast] };
        case 'UPDATE_TOAST':
          return {
            ...state,
            toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
          };
        case 'DISMISS_TOAST':
          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === action.toastId || action.toastId === undefined ? { ...t, open: false } : t,
            ),
          };
        case 'REMOVE_TOAST':
          return {
            ...state,
            toasts: action.toastId === undefined ? [] : state.toasts.filter((t) => t.id !== action.toastId),
          };
        default:
          return state;
      }
    }),
  };
});

// 各テストの前に実行するグローバル設定
beforeEach(() => {
  // テスト環境のリセット
  jest.clearAllMocks();
});
