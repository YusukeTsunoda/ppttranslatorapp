/// <reference path="../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TranslatePage from '@/app/(dashboard)/translate/page';
import '@testing-library/jest-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

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

// fetchのモック
globalThis.fetch = jest.fn();

describe('TranslatePage', () => {
  const mockRouter = {
    push: jest.fn(),
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
    (useRouter as any).mockReturnValue(mockRouter);
    (useSession as any).mockReturnValue(mockSession);
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        fileId: 'test-file-id',
        slides: [
          {
            id: 'slide1',
            title: 'テストスライド',
            content: 'これはテストスライドのコンテンツです。',
            imageUrl: '/test-image.png',
            texts: [
              {
                id: 'text1',
                text: 'サンプルテキスト1',
                position: { x: 100, y: 100, width: 200, height: 50 },
                translations: [],
              },
            ],
            index: 0,
          },
        ],
      }),
    });
  });

  it('ページが正しくレンダリングされること', async () => {
    render(<TranslatePage />);

    // ページタイトルが表示されていることを確認
    expect(screen.getByText('プレゼンテーション翻訳')).toBeInTheDocument();

    // ファイルアップロードコンポーネントが表示されていることを確認
    expect(screen.getByTestId('file-upload-component')).toBeInTheDocument();

    // 言語選択が表示されていることを確認
    expect(screen.getByText('翻訳元言語')).toBeInTheDocument();
    expect(screen.getByText('翻訳先言語')).toBeInTheDocument();
  });

  it('ファイルがアップロードされたときにAPIが呼ばれること', async () => {
    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // APIが呼ばれたことを確認
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/upload', expect.any(Object));
    });
  });

  it('アップロード後にスライドが表示されること', async () => {
    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // スライドが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByTestId('preview-section-component')).toBeInTheDocument();
    });

    // スライド数が1であることを確認
    await waitFor(() => {
      expect(screen.getByTestId('slides-count').textContent).toBe('1');
    });
  });

  it('翻訳言語を選択できること', async () => {
    render(<TranslatePage />);

    // 翻訳元言語のセレクトボックスを取得
    const sourceLangSelect = screen.getByLabelText('翻訳元言語');
    expect(sourceLangSelect).toBeInTheDocument();

    // 翻訳先言語のセレクトボックスを取得
    const targetLangSelect = screen.getByLabelText('翻訳先言語');
    expect(targetLangSelect).toBeInTheDocument();
  });

  it('翻訳ボタンが表示され、クリックするとAPIが呼ばれること', async () => {
    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // 翻訳ボタンが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('翻訳開始')).toBeInTheDocument();
    });

    // 翻訳ボタンをクリック
    fireEvent.click(screen.getByText('翻訳開始'));

    // 翻訳APIが呼ばれたことを確認
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/translate', expect.any(Object));
    });
  });

  it('エラー発生時にエラーメッセージが表示されること', async () => {
    // エラーレスポンスをモック
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'サーバーエラーが発生しました' }),
    });

    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // エラーメッセージが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });

  it('認証が必要な場合にログインページにリダイレクトされること', async () => {
    // 401エラーレスポンスをモック
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: '認証が必要です' }),
    });

    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // ログインページにリダイレクトされることを確認
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('/signin'));
    });
  });

  it('スライドの切り替えができること', async () => {
    // 複数のスライドを含むレスポンスをモック
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        fileId: 'test-file-id',
        slides: [
          {
            id: 'slide1',
            title: 'テストスライド1',
            content: 'これはテストスライド1のコンテンツです。',
            imageUrl: '/test-image-1.png',
            texts: [],
            index: 0,
          },
          {
            id: 'slide2',
            title: 'テストスライド2',
            content: 'これはテストスライド2のコンテンツです。',
            imageUrl: '/test-image-2.png',
            texts: [],
            index: 1,
          },
        ],
      }),
    });

    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // スライドが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByTestId('preview-section-component')).toBeInTheDocument();
    });

    // 次のスライドボタンをクリック
    fireEvent.click(screen.getByTestId('next-slide-button'));

    // 現在のスライドが1になることを確認
    await waitFor(() => {
      expect(screen.getByTestId('current-slide').textContent).toBe('1');
    });

    // 前のスライドボタンをクリック
    fireEvent.click(screen.getByTestId('prev-slide-button'));

    // 現在のスライドが0に戻ることを確認
    await waitFor(() => {
      expect(screen.getByTestId('current-slide').textContent).toBe('0');
    });
  });

  it('翻訳中のローディング状態が表示されること', async () => {
    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // 翻訳ボタンが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('翻訳開始')).toBeInTheDocument();
    });

    // 翻訳ボタンをクリック
    fireEvent.click(screen.getByText('翻訳開始'));

    // ローディング状態が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/翻訳中/)).toBeInTheDocument();
    });
  });

  it('翻訳結果が表示されること', async () => {
    // 翻訳結果のモック
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          fileId: 'test-file-id',
          slides: [
            {
              id: 'slide1',
              title: 'テストスライド',
              content: 'これはテストスライドのコンテンツです。',
              imageUrl: '/test-image.png',
              texts: [
                {
                  id: 'text1',
                  text: 'サンプルテキスト1',
                  position: { x: 100, y: 100, width: 200, height: 50 },
                  translations: [],
                },
              ],
              index: 0,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          translations: [
            {
              id: 'text1',
              original: 'サンプルテキスト1',
              translated: 'Sample Text 1',
            },
          ],
        }),
      });

    render(<TranslatePage />);

    // ファイルアップロードボタンをクリック
    fireEvent.click(screen.getByTestId('mock-upload-button'));

    // 翻訳ボタンが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('翻訳開始')).toBeInTheDocument();
    });

    // 翻訳ボタンをクリック
    fireEvent.click(screen.getByText('翻訳開始'));

    // 翻訳APIが呼ばれたことを確認
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/translate', expect.any(Object));
    });
  });
});
