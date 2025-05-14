import React from 'react';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';
import '@testing-library/jest-dom';

describe('Skeleton', () => {
  it('デフォルトのスタイルでレンダリングされること', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded-md');
    expect(skeleton).toHaveClass('bg-muted');
  });

  it('カスタムクラス名が適用されること', () => {
    render(<Skeleton className="w-40 h-10 custom-class" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('w-40');
    expect(skeleton).toHaveClass('h-10');
    expect(skeleton).toHaveClass('custom-class');
  });

  it('子要素を持つことができること', () => {
    render(
      <Skeleton>
        <div data-testid="child">子要素</div>
      </Skeleton>
    );
    
    const skeleton = screen.getByTestId('skeleton');
    const child = screen.getByTestId('child');
    
    expect(skeleton).toContainElement(child);
    expect(child).toHaveTextContent('子要素');
  });
}); 