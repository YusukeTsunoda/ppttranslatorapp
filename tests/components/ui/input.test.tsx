import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';
import { expect } from '@jest/globals';

describe('Input Component', () => {
  it('デフォルトのInputをレンダリングする', () => {
    render(<Input data-testid="test-input" />);
    
    const input = screen.getByTestId('test-input');
    expect(input).toBeInTheDocument();
    // Inputコンポーネントはデフォルトでtypeを設定していないため、テストを修正
  });
  
  it('異なるタイプのInputをレンダリングする', () => {
    render(<Input type="email" data-testid="email-input" />);
    
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
  });
  
  it('プレースホルダーを表示する', () => {
    const placeholder = 'メールアドレスを入力';
    render(<Input placeholder={placeholder} data-testid="input-with-placeholder" />);
    
    const input = screen.getByTestId('input-with-placeholder');
    expect(input).toHaveAttribute('placeholder', placeholder);
  });
  
  it('無効化されたInputをレンダリングする', () => {
    render(<Input disabled data-testid="disabled-input" />);
    
    const input = screen.getByTestId('disabled-input');
    expect(input).toBeDisabled();
  });
  
  it('必須のInputをレンダリングする', () => {
    render(<Input required data-testid="required-input" />);
    
    const input = screen.getByTestId('required-input');
    expect(input).toHaveAttribute('required');
  });
  
  it('カスタムクラス名を適用する', () => {
    render(<Input className="custom-input" data-testid="custom-input" />);
    
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveClass('custom-input');
  });
  
  it('デフォルトの値を持つInputをレンダリングする', () => {
    const defaultValue = 'デフォルト値';
    render(<Input defaultValue={defaultValue} data-testid="input-with-default" />);
    
    const input = screen.getByTestId('input-with-default');
    expect(input).toHaveValue(defaultValue);
  });
}); 