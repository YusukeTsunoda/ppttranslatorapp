/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// テスト用の型定義
interface Translation {
  language: string;
  text: string;
}

interface TextItem {
  id: string;
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  translations: Translation[];
}

interface TextListProps {
  texts: TextItem[];
  onTextSelect?: (index: number) => void;
  selectedTextIndex?: number | null;
  onTextHover?: (index: number | null) => void;
  searchTerm?: string;
  hideTranslated?: boolean;
  selectedLanguage?: string;
}

// モックデータ
const mockTexts: TextItem[] = [
  {
    id: 'text1',
    text: 'サンプルテキスト1',
    position: { x: 100, y: 100, width: 200, height: 50 },
    translations: [
      { language: 'en', text: 'Sample Text 1' },
      { language: 'fr', text: 'Exemple de texte 1' },
    ],
  },
  {
    id: 'text2',
    text: 'サンプルテキスト2',
    position: { x: 100, y: 200, width: 200, height: 50 },
    translations: [{ language: 'en', text: 'Sample Text 2' }],
  },
  {
    id: 'text3',
    text: 'サンプルテキスト3',
    position: { x: 100, y: 300, width: 200, height: 50 },
    translations: [],
  },
];

// TextListコンポーネントを定義
const TextList = ({
  texts,
  onTextSelect,
  selectedTextIndex,
  onTextHover,
  searchTerm,
  hideTranslated,
  selectedLanguage,
}: TextListProps) => (
  <div data-testid="text-list">
    {texts
      .filter((text) => !searchTerm || text.text.includes(searchTerm))
      .filter((text) => {
        if (!hideTranslated || !selectedLanguage) return true;
        const hasTranslation = text.translations.some((t) => t.language === selectedLanguage);
        return !hasTranslation;
      })
      .map((text, i) => (
        <div
          key={text.id}
          data-testid={`text-item-${i}`}
          className={selectedTextIndex === i ? 'selected' : ''}
          onClick={() => onTextSelect && onTextSelect(i)}
          onMouseEnter={() => onTextHover && onTextHover(i)}
          onMouseLeave={() => onTextHover && onTextHover(null)}
        >
          {text.text}
          <div data-testid={`text-translations-${i}`}>
            {text.translations.map((t, j) => (
              <div key={j} data-testid={`translation-${i}-${t.language}`}>
                {t.language}: {t.text}
              </div>
            ))}
          </div>
        </div>
      ))}
  </div>
);

describe('TextList', () => {
  it('テキストリストを表示する', () => {
    render(<TextList texts={mockTexts} />);

    // 3つのテキストアイテムが表示されていることを確認
    expect(screen.getAllByTestId(/text-item-/)).toHaveLength(3);
    expect(screen.getByText('サンプルテキスト1')).toBeInTheDocument();
    expect(screen.getByText('サンプルテキスト2')).toBeInTheDocument();
    expect(screen.getByText('サンプルテキスト3')).toBeInTheDocument();
  });

  it('テキスト選択コールバックが機能する', () => {
    const mockOnTextSelect = jest.fn();

    render(<TextList texts={mockTexts} onTextSelect={mockOnTextSelect} />);

    // テキストアイテムをクリック
    const textItem = screen.getByTestId('text-item-0');
    fireEvent.click(textItem);
    expect(mockOnTextSelect).toHaveBeenCalledWith(0);
  });

  it('選択されたテキストにselectedクラスが付与される', () => {
    render(<TextList texts={mockTexts} selectedTextIndex={1} />);

    // 選択されたテキストアイテムにselectedクラスが付与されていることを確認
    const textItem = screen.getByTestId('text-item-1');
    expect(textItem).toHaveClass('selected');
  });

  it('テキストホバーコールバックが機能する', () => {
    const mockOnTextHover = jest.fn();

    render(<TextList texts={mockTexts} onTextHover={mockOnTextHover} />);

    // テキストアイテムにマウスオーバー
    const textItem = screen.getByTestId('text-item-0');
    fireEvent.mouseEnter(textItem);
    expect(mockOnTextHover).toHaveBeenCalledWith(0);

    // テキストアイテムからマウスアウト
    fireEvent.mouseLeave(textItem);
    expect(mockOnTextHover).toHaveBeenCalledWith(null);
  });

  it('検索語に基づいてテキストをフィルタリングする', () => {
    render(<TextList texts={mockTexts} searchTerm="テキスト1" />);

    // 検索語に一致するテキストのみが表示されていることを確認
    expect(screen.getAllByTestId(/text-item-/)).toHaveLength(1);
    expect(screen.getByText('サンプルテキスト1')).toBeInTheDocument();
    expect(screen.queryByText('サンプルテキスト2')).not.toBeInTheDocument();
    expect(screen.queryByText('サンプルテキスト3')).not.toBeInTheDocument();
  });

  it('翻訳済みのテキストを非表示にする', () => {
    render(<TextList texts={mockTexts} hideTranslated={true} selectedLanguage="en" />);

    // 英語の翻訳がないテキストのみが表示されていることを確認
    expect(screen.getAllByTestId(/text-item-/)).toHaveLength(1);
    expect(screen.queryByText('サンプルテキスト1')).not.toBeInTheDocument();
    expect(screen.queryByText('サンプルテキスト2')).not.toBeInTheDocument();
    expect(screen.getByText('サンプルテキスト3')).toBeInTheDocument();
  });

  it('翻訳情報を表示する', () => {
    render(<TextList texts={mockTexts} />);

    // 各テキストアイテムの翻訳情報が表示されていることを確認
    expect(screen.getByTestId('translation-0-en')).toHaveTextContent('en: Sample Text 1');
    expect(screen.getByTestId('translation-0-fr')).toHaveTextContent('fr: Exemple de texte 1');
    expect(screen.getByTestId('translation-1-en')).toHaveTextContent('en: Sample Text 2');

    // 翻訳がないテキストには翻訳情報が表示されていないことを確認
    expect(screen.queryByTestId('translation-2-en')).not.toBeInTheDocument();
  });
});
