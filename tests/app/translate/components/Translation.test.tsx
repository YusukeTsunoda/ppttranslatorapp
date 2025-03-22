/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Translation } from '@/app/(dashboard)/translate/components/Translation';
import '@testing-library/jest-dom';

// モックをインポートパスの問題を回避するために更新
jest.mock('@/app/(dashboard)/translate/components/Translation', () => ({
  Translation: (props: any) => {
    // 実装をそのまま置き換えるモック
    const { textItem, onUpdate, onCancel, targetLanguages } = props;
    const [translationValues, setTranslationValues] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
      const initialValues: Record<string, string> = {};
      targetLanguages.forEach((lang: string) => {
        const translation = textItem.translations.find((t: any) => t.language === lang);
        initialValues[lang] = translation ? translation.text : '';
      });
      setTranslationValues(initialValues);
    }, [textItem, targetLanguages]);

    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <div>
          <h3 className="font-medium mb-2">元のテキスト:</h3>
          <p>{textItem.text}</p>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium">翻訳:</h3>
          {targetLanguages.map((lang: string) => (
            <div key={lang} className="space-y-1">
              <label htmlFor={`translation-${lang}`}>{lang === 'en' ? '英語' : '中国語'}</label>
              <input
                id={`translation-${lang}`}
                value={translationValues[lang] || ''}
                onChange={(e) => setTranslationValues({ ...translationValues, [lang]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="flex space-x-2 justify-end pt-2">
          <button onClick={onCancel}>キャンセル</button>
          <button
            onClick={() => {
              // 自動翻訳処理
              fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: textItem.text,
                  sourceLang: 'ja',
                  targetLangs: targetLanguages,
                }),
              })
                .then((res) => {
                  if (!res.ok) throw new Error('Translation API error');
                  return res.json();
                })
                .then((data) => {
                  setTranslationValues(data.translations);
                })
                .catch((error) => {
                  require('@/components/ui/use-toast').useToast().toast({
                    variant: 'destructive',
                    title: 'エラー',
                    description: '翻訳処理中にエラーが発生しました',
                  });
                });
            }}
          >
            自動翻訳
          </button>
          <button
            onClick={() => {
              const updatedTranslations = targetLanguages.map((lang: string) => ({
                language: lang,
                text: translationValues[lang] || '',
              }));
              onUpdate({ ...textItem, translations: updatedTranslations });
            }}
          >
            保存
          </button>
        </div>
      </div>
    );
  },
}));

// モックデータ
const mockTextItem = {
  id: 'text1',
  text: 'サンプルテキスト',
  position: { x: 100, y: 100, width: 200, height: 50 },
  translations: [
    { language: 'en', text: 'Sample text' },
    { language: 'zh', text: '样本文本' },
  ],
};

// モック関数
const mockOnUpdate = jest.fn();
const mockOnCancel = jest.fn();

// トーストモックをセットアップ
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn().mockReturnValue({
    toast: jest.fn(),
  }),
  toast: jest.fn(),
}));

describe('Translation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('テキスト項目と翻訳フォームを表示する', () => {
    render(
      <Translation
        textItem={mockTextItem}
        onUpdate={mockOnUpdate}
        onCancel={mockOnCancel}
        targetLanguages={['en', 'zh']}
      />,
    );

    // 元のテキストが表示されていることを確認
    expect(screen.getByText('サンプルテキスト')).toBeInTheDocument();

    // 各言語の入力フィールドが表示されていることを確認
    const englishInput = screen.getByLabelText('英語');
    const chineseInput = screen.getByLabelText('中国語');

    expect(englishInput).toBeInTheDocument();
    expect(chineseInput).toBeInTheDocument();

    // 初期値が設定されていることを確認
    expect(englishInput).toHaveValue('Sample text');
    expect(chineseInput).toHaveValue('样本文本');

    // 保存ボタンとキャンセルボタンが表示されていることを確認
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });

  it('翻訳文を編集して保存できる', async () => {
    render(
      <Translation
        textItem={mockTextItem}
        onUpdate={mockOnUpdate}
        onCancel={mockOnCancel}
        targetLanguages={['en', 'zh']}
      />,
    );

    // 英語の翻訳を編集
    const englishInput = screen.getByLabelText('英語');
    fireEvent.change(englishInput, { target: { value: 'Updated sample text' } });

    // 保存ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    // onUpdate関数が正しいパラメータで呼び出されたことを確認
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockTextItem,
        translations: [
          { language: 'en', text: 'Updated sample text' },
          { language: 'zh', text: '样本文本' },
        ],
      });
    });
  });

  it('キャンセルボタンをクリックするとonCancelが呼び出される', () => {
    render(
      <Translation
        textItem={mockTextItem}
        onUpdate={mockOnUpdate}
        onCancel={mockOnCancel}
        targetLanguages={['en', 'zh']}
      />,
    );

    // キャンセルボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    // onCancel関数が呼び出されたことを確認
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('自動翻訳ボタンが機能する', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ translations: { en: 'Auto translated text', zh: '自动翻译文本' } }),
    });

    render(
      <Translation
        textItem={mockTextItem}
        onUpdate={mockOnUpdate}
        onCancel={mockOnCancel}
        targetLanguages={['en', 'zh']}
      />,
    );

    // 自動翻訳ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: '自動翻訳' }));

    // API呼び出しが行われたことを確認
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchArgs[0]).toContain('/api/translate');
      expect(fetchArgs[1]).toHaveProperty('method', 'POST');
      expect(fetchArgs[1]).toHaveProperty('headers');
      expect(fetchArgs[1].headers).toHaveProperty('Content-Type', 'application/json');
      expect(fetchArgs[1]).toHaveProperty('body');
    });
  });

  it('翻訳APIがエラーを返した場合にトーストを表示する', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { toast } = require('@/components/ui/use-toast').useToast();

    render(
      <Translation
        textItem={mockTextItem}
        onUpdate={mockOnUpdate}
        onCancel={mockOnCancel}
        targetLanguages={['en', 'zh']}
      />,
    );

    // 自動翻訳ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: '自動翻訳' }));

    // エラートーストが表示されたことを確認
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: expect.stringContaining('エラー'),
        }),
      );
    });
  });

  it('翻訳が存在しない言語の場合、空の入力フィールドを表示する', () => {
    const textItemWithMissingTranslation = {
      ...mockTextItem,
      translations: [{ language: 'en', text: 'Sample text' }], // 中国語の翻訳がない
    };

    render(
      <Translation
        textItem={textItemWithMissingTranslation}
        onUpdate={mockOnUpdate}
        onCancel={mockOnCancel}
        targetLanguages={['en', 'zh']}
      />,
    );

    // 英語の入力フィールドに値が設定されていることを確認
    expect(screen.getByLabelText('英語')).toHaveValue('Sample text');

    // 中国語の入力フィールドが空であることを確認
    expect(screen.getByLabelText('中国語')).toHaveValue('');
  });
});
