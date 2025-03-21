import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { expect } from '@jest/globals';

describe('Card Components', () => {
  describe('Card', () => {
    it('基本的なCardをレンダリングする', () => {
      render(<Card data-testid="test-card">カードコンテンツ</Card>);

      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('カードコンテンツ');
    });

    it('カスタムクラス名を適用する', () => {
      render(
        <Card className="custom-card" data-testid="test-card">
          カードコンテンツ
        </Card>,
      );

      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('custom-card');
    });
  });

  describe('CardHeader', () => {
    it('CardHeaderをレンダリングする', () => {
      render(<CardHeader data-testid="test-header">ヘッダーコンテンツ</CardHeader>);

      const header = screen.getByTestId('test-header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('ヘッダーコンテンツ');
    });

    it('カスタムクラス名を適用する', () => {
      render(
        <CardHeader className="custom-header" data-testid="test-header">
          ヘッダーコンテンツ
        </CardHeader>,
      );

      const header = screen.getByTestId('test-header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('CardTitleをレンダリングする', () => {
      render(<CardTitle data-testid="test-title">カードタイトル</CardTitle>);

      const title = screen.getByTestId('test-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('カードタイトル');
    });

    it('カスタムクラス名を適用する', () => {
      render(
        <CardTitle className="custom-title" data-testid="test-title">
          カードタイトル
        </CardTitle>,
      );

      const title = screen.getByTestId('test-title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('CardDescriptionをレンダリングする', () => {
      render(<CardDescription data-testid="test-desc">カードの説明</CardDescription>);

      const desc = screen.getByTestId('test-desc');
      expect(desc).toBeInTheDocument();
      expect(desc).toHaveTextContent('カードの説明');
    });

    it('カスタムクラス名を適用する', () => {
      render(
        <CardDescription className="custom-desc" data-testid="test-desc">
          カードの説明
        </CardDescription>,
      );

      const desc = screen.getByTestId('test-desc');
      expect(desc).toHaveClass('custom-desc');
    });
  });

  describe('CardContent', () => {
    it('CardContentをレンダリングする', () => {
      render(<CardContent data-testid="test-content">カードのコンテンツ</CardContent>);

      const content = screen.getByTestId('test-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('カードのコンテンツ');
    });

    it('カスタムクラス名を適用する', () => {
      render(
        <CardContent className="custom-content" data-testid="test-content">
          カードのコンテンツ
        </CardContent>,
      );

      const content = screen.getByTestId('test-content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('CardFooterをレンダリングする', () => {
      render(<CardFooter data-testid="test-footer">フッターコンテンツ</CardFooter>);

      const footer = screen.getByTestId('test-footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveTextContent('フッターコンテンツ');
    });

    it('カスタムクラス名を適用する', () => {
      render(
        <CardFooter className="custom-footer" data-testid="test-footer">
          フッターコンテンツ
        </CardFooter>,
      );

      const footer = screen.getByTestId('test-footer');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Card Composition', () => {
    it('すべてのカードコンポーネントを組み合わせる', () => {
      render(
        <Card data-testid="test-card">
          <CardHeader>
            <CardTitle data-testid="test-title">カードタイトル</CardTitle>
            <CardDescription data-testid="test-desc">カードの説明</CardDescription>
          </CardHeader>
          <CardContent data-testid="test-content">カードのコンテンツ</CardContent>
          <CardFooter data-testid="test-footer">フッターコンテンツ</CardFooter>
        </Card>,
      );

      expect(screen.getByTestId('test-card')).toBeInTheDocument();
      expect(screen.getByTestId('test-title')).toHaveTextContent('カードタイトル');
      expect(screen.getByTestId('test-desc')).toHaveTextContent('カードの説明');
      expect(screen.getByTestId('test-content')).toHaveTextContent('カードのコンテンツ');
      expect(screen.getByTestId('test-footer')).toHaveTextContent('フッターコンテンツ');
    });
  });
});
