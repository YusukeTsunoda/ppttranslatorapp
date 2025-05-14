import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '@/components/ui/textarea';
import '@testing-library/jest-dom';

describe('Textarea', () => {
  it('正しくレンダリングされること', () => {
    render(<Textarea placeholder="テキストを入力" />);
    
    const textarea = screen.getByPlaceholderText('テキストを入力');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('テキスト入力を処理できること', () => {
    render(<Textarea placeholder="テキストを入力" />);
    
    const textarea = screen.getByPlaceholderText('テキストを入力');
    fireEvent.change(textarea, { target: { value: 'テストメッセージ' } });
    
    expect(textarea).toHaveValue('テストメッセージ');
  });

  it('追加のクラス名が適用されること', () => {
    render(<Textarea className="custom-class" />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-class');
  });

  it('禁止状態が正しく反映されること', () => {
    render(<Textarea disabled />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('読み取り専用状態が正しく反映されること', () => {
    render(<Textarea readOnly />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('readOnly');
  });

  it('フォームイベントが正しく処理されること', () => {
    const handleChange = jest.fn();
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    
    render(
      <Textarea
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
    
    const textarea = screen.getByRole('textbox');
    
    // 変更イベント
    fireEvent.change(textarea, { target: { value: 'テストテキスト' } });
    expect(handleChange).toHaveBeenCalled();
    
    // フォーカスイベント
    fireEvent.focus(textarea);
    expect(handleFocus).toHaveBeenCalled();
    
    // ブラーイベント
    fireEvent.blur(textarea);
    expect(handleBlur).toHaveBeenCalled();
  });
}); 