import React from 'react';
import { render, screen } from '@testing-library/react';
import { Label } from '@/components/ui/label';
import { expect } from '@jest/globals';

describe('Label Component', () => {
  it('基本的なLabelをレンダリングする', () => {
    render(<Label data-testid="test-label">テストラベル</Label>);
    
    const label = screen.getByTestId('test-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('テストラベル');
  });
  
  it('htmlForプロパティを正しく設定する', () => {
    render(<Label htmlFor="test-input" data-testid="test-label">テストラベル</Label>);
    
    const label = screen.getByTestId('test-label');
    expect(label).toHaveAttribute('for', 'test-input');
  });
  
  it('カスタムクラス名を適用する', () => {
    render(<Label className="custom-label" data-testid="test-label">テストラベル</Label>);
    
    const label = screen.getByTestId('test-label');
    expect(label).toHaveClass('custom-label');
  });
  
  it('無効化された状態を表示する', () => {
    render(
      <div>
        <Label htmlFor="disabled-input" data-testid="test-label">無効化されたラベル</Label>
        <input id="disabled-input" disabled />
      </div>
    );
    
    const label = screen.getByTestId('test-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('無効化されたラベル');
  });
  
  it('追加のプロパティを渡す', () => {
    render(<Label aria-label="ラベル説明" data-testid="test-label">テストラベル</Label>);
    
    const label = screen.getByTestId('test-label');
    expect(label).toHaveAttribute('aria-label', 'ラベル説明');
  });
}); 