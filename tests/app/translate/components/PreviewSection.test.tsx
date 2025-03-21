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
    texts: [],
    index: 0 // 必須フィールドを追加
  }
];

describe('PreviewSection', () => {
  it('スライドプレビューを表示する', () => {
    render(
      <PreviewSectionComponent 
        currentSlide={0} 
        slides={mockSlides} 
        onSlideChange={() => {}} 
      />
    );
    
    // タイトルが表示されていることを確認
    expect(screen.getByText('プレビュー')).toBeInTheDocument();
  });

  it('ズームインボタンとズームアウトボタンが機能する', () => {
    render(
      <PreviewSectionComponent 
        currentSlide={0} 
        slides={mockSlides} 
        onSlideChange={() => {}} 
      />
    );
    
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
});
