/// <reference path="../../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewSectionComponent } from '@/app/(dashboard)/translate/components/PreviewSection';
import '@testing-library/jest-dom';

// モックデータ
const mockSlides = [
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
        translations: [{ language: 'en', text: 'Sample Text 1' }]
      },
      {
        id: 'text2',
        text: 'サンプルテキスト2',
        position: { x: 100, y: 200, width: 200, height: 50 },
        translations: [{ language: 'en', text: 'Sample Text 2' }]
      }
    ],
    index: 0,
  },
  {
    id: 'slide2',
    title: 'テストスライド2',
    content: 'これは2つ目のテストスライドです。',
    imageUrl: '/test-image-2.png',
    texts: [],
    index: 1,
  }
];

describe('PreviewSection', () => {
  it('スライドプレビューを表示する', () => {
    render(<PreviewSectionComponent currentSlide={0} slides={mockSlides} onSlideChange={() => {}} />);

    // タイトルが表示されていることを確認
    expect(screen.getByText('プレビュー')).toBeInTheDocument();
  });

  it('ズームインボタンとズームアウトボタンが機能する', () => {
    render(<PreviewSectionComponent currentSlide={0} slides={mockSlides} onSlideChange={() => {}} />);

    // ズームインボタンを取得（title属性を使用）
    const zoomInButton = screen.getByTitle('拡大');
    const zoomOutButton = screen.getByTitle('縮小');

    // ボタンが存在することを確認
    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();

    // ズームインボタンをクリック
    fireEvent.click(zoomInButton);

    // ズームアウトボタンをクリック
    fireEvent.click(zoomOutButton);
  });

  it('スライド切り替えボタンが機能する', () => {
    const mockOnSlideChange = jest.fn();
    render(
      <PreviewSectionComponent 
        currentSlide={0} 
        slides={mockSlides} 
        onSlideChange={mockOnSlideChange} 
      />
    );

    // 次へボタンをクリック
    const nextButton = screen.getByLabelText('次のスライド');
    fireEvent.click(nextButton);
    expect(mockOnSlideChange).toHaveBeenCalledWith(1);

    // 前へボタンをクリック
    const prevButton = screen.getByLabelText('前のスライド');
    fireEvent.click(prevButton);
    expect(mockOnSlideChange).toHaveBeenCalledWith(0);
  });

  it('テキスト要素を選択できる', () => {
    const mockOnTextSelect = jest.fn();
    render(
      <PreviewSectionComponent 
        currentSlide={0} 
        slides={mockSlides} 
        onSlideChange={() => {}} 
        onTextSelect={mockOnTextSelect}
      />
    );

    // テキスト要素が表示されていることを確認
    const textElements = screen.getAllByTestId(/text-overlay-/);
    expect(textElements.length).toBe(2);

    // テキスト要素をクリック
    fireEvent.click(textElements[0]);
    expect(mockOnTextSelect).toHaveBeenCalledWith(0);

    // 同じテキスト要素を再度クリックすると選択が解除される
    fireEvent.click(textElements[0]);
    expect(mockOnTextSelect).toHaveBeenCalledWith(null);
  });

  it('テキスト要素にホバーできる', () => {
    const mockOnTextHover = jest.fn();
    render(
      <PreviewSectionComponent 
        currentSlide={0} 
        slides={mockSlides} 
        onSlideChange={() => {}} 
        onTextHover={mockOnTextHover}
      />
    );

    // テキスト要素が表示されていることを確認
    const textElements = screen.getAllByTestId(/text-overlay-/);

    // テキスト要素にマウスオーバー
    fireEvent.mouseEnter(textElements[0]);
    expect(mockOnTextHover).toHaveBeenCalledWith(0);

    // テキスト要素からマウスアウト
    fireEvent.mouseLeave(textElements[0]);
    expect(mockOnTextHover).toHaveBeenCalledWith(null);
  });

  it('リセットボタンが機能する', () => {
    render(<PreviewSectionComponent currentSlide={0} slides={mockSlides} onSlideChange={() => {}} />);

    // リセットボタンを取得
    const resetButton = screen.getByTitle('リセット');
    expect(resetButton).toBeInTheDocument();

    // ズームインしてからリセット
    const zoomInButton = screen.getByTitle('拡大');
    fireEvent.click(zoomInButton);
    fireEvent.click(resetButton);
  });

  it('スライドが存在しない場合にエラーメッセージを表示する', () => {
    render(<PreviewSectionComponent currentSlide={0} slides={[]} onSlideChange={() => {}} />);

    // エラーメッセージが表示されていることを確認
    expect(screen.getByText('スライドが見つかりません')).toBeInTheDocument();
  });
});
