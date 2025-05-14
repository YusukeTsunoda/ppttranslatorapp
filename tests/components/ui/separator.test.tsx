import React from 'react';
import { render, screen } from '@testing-library/react';
import { Separator } from '@/components/ui/separator';
import '@testing-library/jest-dom';

// Radixコンポーネントのモック
jest.mock('@radix-ui/react-separator', () => {
  return {
    Root: React.forwardRef(({ className, orientation, decorative, ...props }: any, ref) => (
      <div
        data-testid="separator"
        data-orientation={orientation}
        data-decorative={decorative}
        className={className}
        ref={ref}
        {...props}
      />
    )),
  };
});

describe('Separator', () => {
  it('デフォルトで水平方向にレンダリングされること', () => {
    render(<Separator />);
    
    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    expect(separator.className).toContain('h-[1px]');
    expect(separator.className).toContain('w-full');
  });

  it('垂直方向にレンダリングできること', () => {
    render(<Separator orientation="vertical" />);
    
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
    expect(separator.className).toContain('h-full');
    expect(separator.className).toContain('w-[1px]');
  });

  it('カスタムクラス名が適用されること', () => {
    render(<Separator className="custom-class" />);
    
    const separator = screen.getByTestId('separator');
    expect(separator.className).toContain('custom-class');
  });

  it('装飾フラグが正しく設定されること', () => {
    render(<Separator decorative />);
    
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-decorative', 'true');
  });
}); 