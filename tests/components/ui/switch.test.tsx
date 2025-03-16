import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '@/components/ui/switch';
import { expect } from '@jest/globals';

describe('Switch Component', () => {
  it('基本的なSwitchをレンダリングする', () => {
    render(<Switch data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toBeInTheDocument();
    // デフォルトではチェックされていない
    expect(switchElement).toHaveAttribute('data-state', 'unchecked');
  });
  
  it('チェック済みのSwitchをレンダリングする', () => {
    render(<Switch checked data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
  });
  
  it('無効化されたSwitchをレンダリングする', () => {
    render(<Switch disabled data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toBeDisabled();
  });
  
  it('カスタムクラス名を適用する', () => {
    render(<Switch className="custom-switch" data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toHaveClass('custom-switch');
  });
  
  it('クリックイベントを処理する', () => {
    const handleCheckedChange = jest.fn();
    
    render(
      <Switch 
        data-testid="test-switch" 
        onCheckedChange={handleCheckedChange} 
      />
    );
    
    const switchElement = screen.getByTestId('test-switch');
    fireEvent.click(switchElement);
    
    expect(handleCheckedChange).toHaveBeenCalledTimes(1);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });
  
  it('追加の属性を設定する', () => {
    render(<Switch aria-label="スイッチの説明" data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toHaveAttribute('aria-label', 'スイッチの説明');
  });
}); 