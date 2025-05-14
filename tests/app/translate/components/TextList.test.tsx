/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TextList from '@/app/(dashboard)/translate/components/TextList';
import { SlideText } from '@/lib/pptx/types';

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
const mockTexts: SlideText[] = [
  { id: '1', text: 'Hello world', position: { x: 0, y: 0, width: 100, height: 50 } },
  { id: '2', text: 'Welcome to testing', position: { x: 0, y: 100, width: 100, height: 50 } },
  { id: '3', text: 'Testing is important', position: { x: 0, y: 200, width: 100, height: 50 } },
];

const mockTranslations = {
  '1': 'こんにちは世界',
  '2': 'テストへようこそ',
};

describe('TextList', () => {
  it('テキストリストを表示する', () => {
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText=""
        hideTranslated={false}
        translations={{}}
      />
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Welcome to testing')).toBeInTheDocument();
    expect(screen.getByText('Testing is important')).toBeInTheDocument();
  });

  it('テキスト選択コールバックが機能する', () => {
    const handleSelectText = jest.fn();
    render(
      <TextList
        texts={mockTexts}
        onSelectText={handleSelectText}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText=""
        hideTranslated={false}
        translations={{}}
      />
    );

    fireEvent.click(screen.getByText('Hello world'));
    expect(handleSelectText).toHaveBeenCalledWith('1');
  });

  it('選択されたテキストにselectedクラスが付与される', () => {
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId="2"
        searchText=""
        hideTranslated={false}
        translations={{}}
      />
    );

    const selectedItem = screen.getByText('Welcome to testing').closest('li');
    expect(selectedItem).toHaveClass('selected');
  });

  it('テキストホバーコールバックが機能する', () => {
    const handleHoverText = jest.fn();
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={handleHoverText}
        selectedTextId={null}
        searchText=""
        hideTranslated={false}
        translations={{}}
      />
    );

    fireEvent.mouseEnter(screen.getByText('Hello world'));
    expect(handleHoverText).toHaveBeenCalledWith('1');

    fireEvent.mouseLeave(screen.getByText('Hello world'));
    expect(handleHoverText).toHaveBeenCalledWith(null);
  });

  it('検索語に基づいてテキストをフィルタリングする', () => {
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText="world"
        hideTranslated={false}
        translations={{}}
      />
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByText('Welcome to testing')).not.toBeInTheDocument();
    expect(screen.queryByText('Testing is important')).not.toBeInTheDocument();
  });

  it('翻訳済みのテキストを非表示にする', () => {
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText=""
        hideTranslated={true}
        translations={mockTranslations}
      />
    );

    expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome to testing')).not.toBeInTheDocument();
    expect(screen.getByText('Testing is important')).toBeInTheDocument();
  });

  it('翻訳情報を表示する', () => {
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText=""
        hideTranslated={false}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText('こんにちは世界')).toBeInTheDocument();
    expect(screen.getByText('テストへようこそ')).toBeInTheDocument();
  });

  it('空のテキストリストを適切に処理する', () => {
    render(
      <TextList
        texts={[]}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText=""
        hideTranslated={false}
        translations={{}}
      />
    );

    expect(screen.getByText('テキストが見つかりません')).toBeInTheDocument();
  });

  it('大文字小文字を区別せずに検索する', () => {
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText="WORLD"
        hideTranslated={false}
        translations={{}}
      />
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByText('Welcome to testing')).not.toBeInTheDocument();
  });

  it('検索結果が空の場合に適切なメッセージを表示する', () => {
    render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText="xyz123"
        hideTranslated={false}
        translations={{}}
      />
    );

    expect(screen.getByText('検索結果がありません')).toBeInTheDocument();
  });

  it('正しい順序でテキストを表示する', () => {
    const { container } = render(
      <TextList
        texts={mockTexts}
        onSelectText={() => {}}
        onHoverText={() => {}}
        selectedTextId={null}
        searchText=""
        hideTranslated={false}
        translations={{}}
      />
    );

    const listItems = container.querySelectorAll('li');
    expect(listItems[0].textContent).toContain('Hello world');
    expect(listItems[1].textContent).toContain('Welcome to testing');
    expect(listItems[2].textContent).toContain('Testing is important');
  });
});
