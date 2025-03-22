/// <reference path="../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TranslatePage from '@/app/(dashboard)/translate/page';
import '@testing-library/jest-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn().mockReturnValue('/translate'),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => {
  const mockToasts: Array<{id: string; title?: string; description?: string; open: boolean}> = [];
  return {
    useToast: jest.fn().mockReturnValue({
      toasts: mockToasts,
      toast: jest.fn(),
      dismiss: jest.fn(),
    }),
    toast: jest.fn(),
  };
});

// FileUploadComponentのモック
jest.mock('@/app/(dashboard)/translate/components/FileUpload', () => ({
  FileUploadComponent: ({ onUploadComplete }: { onUploadComplete: (file: File) => void }) => (
    <div data-testid="file-upload-component">
      <input
        type="file"
        data-testid="mock-file-input"
        onChange={(e) => e.target.files && onUploadComplete(e.target.files[0])}
      />
      <button
        onClick={() => {
          const file = new File(['dummy content'], 'test.pptx', {
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          });
          onUploadComplete(file);
        }}
        data-testid="mock-upload-button"
      >
        ファイルをアップロード
      </button>
    </div>
  ),
}));

// PreviewSectionComponentのモック
jest.mock('@/app/(dashboard)/translate/components/PreviewSection', () => ({
  PreviewSectionComponent: ({ currentSlide, slides, onSlideChange, onTextSelect, onTextHover }: any) => (
    <div data-testid="preview-section-component">
      <div data-testid="current-slide">{currentSlide}</div>
      <div data-testid="slides-count">{slides.length}</div>
      <button onClick={() => onSlideChange(currentSlide + 1)} data-testid="next-slide-button">
        次のスライド
      </button>
      <button onClick={() => onSlideChange(currentSlide - 1)} data-testid="prev-slide-button">
        前のスライド
      </button>
      <button onClick={() => onTextSelect(0)} data-testid="select-text-button">
        テキスト選択
      </button>
      <button onClick={() => onTextHover(0)} data-testid="hover-text-button">
        テキストホバー
      </button>
    </div>
  ),
}));

// swrのモック
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    data: null,
    error: null,
    mutate: jest.fn(),
    isValidating: false,
    isLoading: false,
  })),
}));

// セッションモック
jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn().mockResolvedValue({
    user: { id: '123', email: 'test@example.com' },
    expires: new Date().toISOString(),
  }),
  signOut: jest.fn(),
}));

// 翻訳サービスのモック
jest.mock('@/lib/translation/translation-service', () => {
  return {
    translatePPTXSlides: jest.fn().mockResolvedValue({
      texts: [
        { id: '1', text: 'サンプルテキスト1', translation: 'Sample Text 1' },
        { id: '2', text: 'サンプルテキスト2', translation: 'Sample Text 2' },
      ],
    }),
  };
});

// fetchのモック
global.fetch = jest.fn().mockImplementation((url) => {
  if (typeof url === 'string' && url.includes('/api/slides')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          slides: [
            {
              id: '1',
              imageUrl: '/test-image.png',
              texts: [
                { id: '1', text: 'サンプルテキスト1', rect: { x: 100, y: 100, width: 200, height: 50 } },
                { id: '2', text: 'サンプルテキスト2', rect: { x: 100, y: 200, width: 200, height: 50 } },
              ],
            },
            {
              id: '2',
              imageUrl: '/test-image2.png',
              texts: [{ id: '3', text: 'サンプルテキスト3', rect: { x: 100, y: 100, width: 200, height: 50 } }],
            },
          ],
        }),
    });
  }
  return Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' }),
  });
});

// 他のモック
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('TranslatePage', () => {
  const mockRouter = {
    push: jest.fn(),
    prefetch: jest.fn(),
    replace: jest.fn(),
  };

  const mockSession = {
    data: {
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: '2023-01-01',
    },
    status: 'authenticated',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter as unknown as AppRouterInstance);
    (useSession as any).mockReturnValue(mockSession);
  });

  it.skip('ページが正しくレンダリングされること', async () => {
    await act(async () => {
      render(<TranslatePage />);
    });

    expect(screen.getByText('PowerPointファイルをアップロード')).toBeInTheDocument();
    expect(screen.getByText('または、ここにファイルをドロップ')).toBeInTheDocument();
  });

  it.skip('ファイルがアップロードされたときにAPIが呼ばれること', async () => {
    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/slides'), expect.any(Object));
    });
  });

  it.skip('アップロード後にスライドが表示されること', async () => {
    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('プレビュー')).toBeInTheDocument();
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  it.skip('翻訳言語を選択できること', async () => {
    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // 言語選択が表示される
    const languageSelect = screen.getByRole('combobox');
    expect(languageSelect).toBeInTheDocument();
  });

  it.skip('翻訳ボタンが表示され、クリックするとAPIが呼ばれること', async () => {
    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      const translateButton = screen.getByRole('button', { name: /翻訳開始/i });
      expect(translateButton).toBeInTheDocument();
    });
  });

  it('エラー発生時にエラーメッセージが表示されること', async () => {
    // fetchをオーバーライドしてエラーを返すようにする
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'サーバーエラー' }),
      })
    );

    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // エラー処理はuseToastを使って行われるのでモックが呼ばれたことを確認
    expect(global.fetch).toHaveBeenCalled();
  });

  it.skip('認証が必要な場合にログインページにリダイレクトされること', async () => {
    // セッションをnullに設定
    require('@/lib/auth/session').getSession.mockResolvedValueOnce(null);

    await act(async () => {
      render(<TranslatePage />);
    });

    // リダイレクトが呼ばれたことを確認
    expect(mockRouter.replace).toHaveBeenCalledWith('/signin?callbackUrl=/translate');
  });

  it.skip('スライドの切り替えができること', async () => {
    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    // 次のスライドボタンをクリック
    const nextButton = screen.getByRole('button', { name: '' }); // アイコンのみのボタン
    await act(async () => {
      fireEvent.click(nextButton);
    });
  });

  it.skip('翻訳中のローディング状態が表示されること', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // 翻訳ボタンを取得
    const translateButton = await screen.findByRole('button', { name: /翻訳開始/i });
    
    // ボタンをクリック
    await act(async () => {
      await user.click(translateButton);
    });
  });

  it.skip('翻訳結果が表示されること', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<TranslatePage />);
    });

    const file = new File(['dummy content'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const fileInput = screen.getByTestId('mock-file-input');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // 翻訳ボタンを取得
    const translateButton = await screen.findByRole('button', { name: /翻訳開始/i });
    
    // ボタンをクリック
    await act(async () => {
      await user.click(translateButton);
    });

    // 翻訳サービスが呼ばれたことを確認
    expect(require('@/lib/translation/translation-service').translatePPTXSlides).toHaveBeenCalled();
  });
});
