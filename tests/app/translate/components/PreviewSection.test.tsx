/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreviewSectionComponent } from '@/app/(dashboard)/translate/components/PreviewSection';
import { SlideData, TextItem } from '@/app/(dashboard)/translate/types';
import '@testing-library/jest-dom';

// モックデータ
const mockSlides: SlideData[] = [
  {
    index: 0,
    imageUrl: '/slide1.png',
    texts: [
      { text: 'テストテキスト1', position: { x: 100, y: 100, width: 200, height: 50 } },
      { text: 'テストテキスト2', position: { x: 100, y: 200, width: 200, height: 50 } }
    ]
  },
  {
    index: 1,
    imageUrl: '/slide2.png',
    texts: [
      { text: 'テストテキスト3', position: { x: 100, y: 100, width: 200, height: 50 } }
    ]
  }
];

// モック関数
const mockOnSlideChange = jest.fn();
const mockOnTextSelect = jest.fn();
const mockOnTextHover = jest.fn();

// モック
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img 
      src={props.src} 
      alt={props.alt} 
      className={props.className} 
      style={props.style} 
      data-testid={props['data-testid'] || 'mock-image'}
      onLoad={props.onLoad}
      onError={props.onError}
    />;
  }
}));

describe('PreviewSectionComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('スライドを正しくレンダリングする', () => {
    render(
      <PreviewSectionComponent
        currentSlide={0}
        slides={mockSlides}
        onSlideChange={mockOnSlideChange}
        onTextSelect={mockOnTextSelect}
        onTextHover={mockOnTextHover}
      />
    );

    // スライドプレビューが表示されていることを確認
    const slidePreview = screen.getByTestId('slide-preview');
    expect(slidePreview).toBeInTheDocument();

    // スライド画像が表示されていることを確認
    const slideImage = screen.getByTestId('slide-image');
    expect(slideImage).toHaveAttribute('src', '/slide1.png');
    expect(slideImage).toHaveAttribute('alt', 'Slide 1');

    // テキストハイライトが表示されていることを確認
    const textHighlight1 = screen.getByTestId('text-highlight-0');
    const textHighlight2 = screen.getByTestId('text-highlight-1');
    expect(textHighlight1).toBeInTheDocument();
    expect(textHighlight2).toBeInTheDocument();
  });

  it('スライド切り替えボタンが正しく動作する', () => {
    render(
      <PreviewSectionComponent
        currentSlide={0}
        slides={mockSlides}
        onSlideChange={mockOnSlideChange}
        onTextSelect={mockOnTextSelect}
        onTextHover={mockOnTextHover}
      />
    );

    // 次のスライドボタンをクリック
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // onSlideChangeが呼ばれたことを確認
    expect(mockOnSlideChange).toHaveBeenCalledWith(1);
  });

  it('テキストクリックでテキスト選択イベントが発火する', () => {
    render(
      <PreviewSectionComponent
        currentSlide={0}
        slides={mockSlides}
        onSlideChange={mockOnSlideChange}
        onTextSelect={mockOnTextSelect}
        onTextHover={mockOnTextHover}
      />
    );

    // テキストハイライトをクリック
    const textHighlight = screen.getByTestId('text-highlight-0');
    fireEvent.click(textHighlight);

    // onTextSelectが呼ばれたことを確認
    expect(mockOnTextSelect).toHaveBeenCalledWith(0);
  });

  it('テキストホバーでホバーイベントが発火する', () => {
    render(
      <PreviewSectionComponent
        currentSlide={0}
        slides={mockSlides}
        onSlideChange={mockOnSlideChange}
        onTextSelect={mockOnTextSelect}
        onTextHover={mockOnTextHover}
      />
    );

    // テキストハイライトにマウスオーバー
    const textHighlight = screen.getByTestId('text-highlight-0');
    fireEvent.mouseEnter(textHighlight);

    // onTextHoverが呼ばれたことを確認
    expect(mockOnTextHover).toHaveBeenCalledWith(0);

    // テキストハイライトからマウスアウト
    fireEvent.mouseLeave(textHighlight);

    // onTextHoverがnullで呼ばれたことを確認
    expect(mockOnTextHover).toHaveBeenCalledWith(null);
  });

  it('ズームコントロールが表示される', () => {
    render(
      <PreviewSectionComponent
        currentSlide={0}
        slides={mockSlides}
        onSlideChange={mockOnSlideChange}
        onTextSelect={mockOnTextSelect}
        onTextHover={mockOnTextHover}
      />
    );

    // ズームインボタンが表示されていることを確認
    const zoomInButton = screen.getByRole('button', { name: /拡大/i });
    expect(zoomInButton).toBeInTheDocument();

    // ズームアウトボタンが表示されていることを確認
    const zoomOutButton = screen.getByRole('button', { name: /縮小/i });
    expect(zoomOutButton).toBeInTheDocument();
  });

  it('画像読み込みエラー時に適切なメッセージが表示される', async () => {
    render(
      <PreviewSectionComponent
        currentSlide={0}
        slides={[
          {
            index: 0,
            imageUrl: '/invalid-image.png',
            texts: [
              { text: 'テストテキスト1', position: { x: 100, y: 100, width: 200, height: 50 } },
              { text: 'テストテキスト2', position: { x: 100, y: 200, width: 200, height: 50 } }
            ]
          }
        ]}
        onSlideChange={mockOnSlideChange}
        onTextSelect={mockOnTextSelect}
        onTextHover={mockOnTextHover}
      />
    );

    const slideImage = screen.getByTestId('slide-image');
    fireEvent.error(slideImage);

    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('画像の読み込みに失敗しました')).toBeInTheDocument();
    });
  });

  it('スライドがない場合は適切なメッセージが表示される', () => {
    render(
      <PreviewSectionComponent
        currentSlide={0}
        slides={[]}
        onSlideChange={mockOnSlideChange}
        onTextSelect={mockOnTextSelect}
        onTextHover={mockOnTextHover}
      />
    );

    // メッセージが表示されていることを確認
    expect(screen.getByText('スライドがありません')).toBeInTheDocument();
  });
});
