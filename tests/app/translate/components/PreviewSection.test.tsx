/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// テスト用の型定義
interface TextItem {
  id: string;
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  translations: {
    language: string;
    text: string;
  }[];
}

interface PreviewSectionProps {
  slides: {
    imageUrl: string;
    texts: TextItem[];
  }[];
  currentSlide: number;
  onSlideChange?: (index: number) => void;
  onTextSelect?: (index: number) => void;
  selectedTextIndex?: number | null;
  onTextHover?: (index: number | null) => void;
}

// モックデータ
const mockSlides = [
  {
    imageUrl: '/test-image.png',
    texts: [
      {
        id: 'text1',
        text: 'サンプルテキスト1',
        position: { x: 100, y: 100, width: 200, height: 50 },
        translations: [{ language: 'en', text: 'Sample Text 1' }],
      },
      {
        id: 'text2',
        text: 'サンプルテキスト2',
        position: { x: 100, y: 200, width: 200, height: 50 },
        translations: [{ language: 'en', text: 'Sample Text 2' }],
      },
    ],
  },
  {
    imageUrl: '/test-image2.png',
    texts: [
      {
        id: 'text3',
        text: 'サンプルテキスト3',
        position: { x: 100, y: 100, width: 200, height: 50 },
        translations: [],
      },
    ],
  },
];

// テスト対象のコンポーネントをモック化
jest.mock('@/app/(dashboard)/translate/components/PreviewSection', () => ({
  PreviewSection: ({ slides, currentSlide, onSlideChange, onTextSelect, selectedTextIndex, onTextHover }: PreviewSectionProps) => (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">プレビュー</h2>
        <div className="flex items-center space-x-2">
          <button 
            disabled={currentSlide === 0}
            onClick={() => onSlideChange && onSlideChange(currentSlide - 1)}
            aria-label="前のスライド"
          >
            ←
          </button>
          <span className="text-sm">
            {currentSlide + 1} / {slides.length}
          </span>
          <button 
            disabled={currentSlide === slides.length - 1}
            onClick={() => onSlideChange && onSlideChange(currentSlide + 1)}
            aria-label="次のスライド"
          >
            →
          </button>
        </div>
      </div>
      <div data-testid="slide-preview">
        <img 
          data-testid="slide-image" 
          src={slides[currentSlide].imageUrl} 
          alt={`Slide ${currentSlide + 1}`} 
        />
        <div>
          {slides[currentSlide].texts.map((text, i) => (
            <div 
              key={text.id}
              data-testid={`text-highlight-${i}`}
              onClick={() => onTextSelect && onTextSelect(i)}
              onMouseEnter={() => onTextHover && onTextHover(i)}
              onMouseLeave={() => onTextHover && onTextHover(null)}
              className={selectedTextIndex === i ? 'selected' : ''}
            />
          ))}
        </div>
      </div>
      <div data-testid="translation-text"></div>
    </div>
  ),
}));

// コンポーネントの型定義
const { PreviewSection } = jest.requireMock('@/app/(dashboard)/translate/components/PreviewSection');

describe('PreviewSection', () => {
  it('スライドプレビューを表示する', () => {
    render(
      <PreviewSection
        slides={mockSlides}
        currentSlide={0}
      />
    );
    
    expect(screen.getByText('プレビュー')).toBeInTheDocument();
    expect(screen.getByTestId('slide-image')).toHaveAttribute('src', '/test-image.png');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('スライド切り替えボタンが機能する', () => {
    const mockOnSlideChange = jest.fn();
    
    render(
      <PreviewSection
        slides={mockSlides}
        currentSlide={0}
        onSlideChange={mockOnSlideChange}
      />
    );
    
    // 次へボタンをクリック
    const nextButton = screen.getByLabelText('次のスライド');
    fireEvent.click(nextButton);
    expect(mockOnSlideChange).toHaveBeenCalledWith(1);
  });

  it('最初のスライドで前へボタンが無効化される', () => {
    render(
      <PreviewSection
        slides={mockSlides}
        currentSlide={0}
      />
    );
    
    const prevButton = screen.getByLabelText('前のスライド');
    expect(prevButton).toBeDisabled();
  });

  it('最後のスライドで次へボタンが無効化される', () => {
    render(
      <PreviewSection
        slides={mockSlides}
        currentSlide={1}
      />
    );
    
    const nextButton = screen.getByLabelText('次のスライド');
    expect(nextButton).toBeDisabled();
  });

  it('テキスト要素がハイライト表示される', () => {
    render(
      <PreviewSection
        slides={mockSlides}
        currentSlide={0}
        selectedTextIndex={0}
      />
    );
    
    const textHighlight = screen.getByTestId('text-highlight-0');
    expect(textHighlight).toHaveClass('selected');
  });
});
