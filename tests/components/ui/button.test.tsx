import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('ボタンをレンダリングする', () => {
    render(<Button>テストボタン</Button>);
    const button = screen.getByRole('button', { name: 'テストボタン' });
    expect(button).toBeInTheDocument();
  });

  it('クリックイベントを処理する', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>クリック</Button>);

    const button = screen.getByRole('button', { name: 'クリック' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('異なるバリアントをレンダリングする', () => {
    render(
      <>
        <Button variant="default" data-testid="default">
          デフォルト
        </Button>
        <Button variant="destructive" data-testid="destructive">
          破壊的
        </Button>
        <Button variant="outline" data-testid="outline">
          アウトライン
        </Button>
        <Button variant="secondary" data-testid="secondary">
          セカンダリ
        </Button>
        <Button variant="ghost" data-testid="ghost">
          ゴースト
        </Button>
        <Button variant="link" data-testid="link">
          リンク
        </Button>
      </>,
    );

    expect(screen.getByTestId('default')).toHaveClass('bg-primary');
    expect(screen.getByTestId('destructive')).toHaveClass('bg-destructive');
    expect(screen.getByTestId('outline')).toHaveClass('border-input');
    expect(screen.getByTestId('secondary')).toHaveClass('bg-secondary');
    expect(screen.getByTestId('ghost')).toHaveClass('hover:bg-accent');
    expect(screen.getByTestId('link')).toHaveClass('text-primary');
  });

  it('異なるサイズをレンダリングする', () => {
    render(
      <>
        <Button size="default" data-testid="default">
          デフォルト
        </Button>
        <Button size="sm" data-testid="sm">
          小
        </Button>
        <Button size="lg" data-testid="lg">
          大
        </Button>
        <Button size="icon" data-testid="icon">
          アイコン
        </Button>
      </>,
    );

    expect(screen.getByTestId('default')).toHaveClass('h-9');
    expect(screen.getByTestId('sm')).toHaveClass('h-8');
    expect(screen.getByTestId('lg')).toHaveClass('h-10');
    expect(screen.getByTestId('icon')).toHaveClass('h-9 w-9');
  });

  it('無効状態をレンダリングする', () => {
    render(
      <Button disabled data-testid="disabled">
        無効
      </Button>,
    );

    const button = screen.getByTestId('disabled');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('カスタムクラス名を適用する', () => {
    render(
      <Button className="custom-class" data-testid="custom">
        カスタム
      </Button>,
    );

    const button = screen.getByTestId('custom');
    expect(button).toHaveClass('custom-class');
  });

  it('asChildプロパティを使用して別の要素としてレンダリングする', () => {
    render(
      <Button asChild>
        <a href="#" data-testid="link-button">
          リンクボタン
        </a>
      </Button>,
    );

    const link = screen.getByTestId('link-button');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '#');
  });
});
