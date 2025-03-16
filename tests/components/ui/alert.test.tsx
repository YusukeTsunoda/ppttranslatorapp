import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { expect } from '@jest/globals';

describe('Alert Component', () => {
  it('デフォルトのアラートをレンダリングする', () => {
    render(<Alert>テストアラート</Alert>);
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('テストアラート');
    expect(alert).toHaveClass('bg-background');
  });
  
  it('destructiveバリアントのアラートをレンダリングする', () => {
    render(<Alert variant="destructive">警告アラート</Alert>);
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('警告アラート');
    expect(alert).toHaveClass('border-destructive/50');
  });
  
  it('カスタムクラス名を適用する', () => {
    render(<Alert className="custom-class">カスタムアラート</Alert>);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });
  
  it('AlertTitleとAlertDescriptionを含むアラートをレンダリングする', () => {
    render(
      <Alert>
        <AlertTitle>アラートタイトル</AlertTitle>
        <AlertDescription>アラートの詳細説明</AlertDescription>
      </Alert>
    );
    
    const alert = screen.getByRole('alert');
    const title = screen.getByText('アラートタイトル');
    const description = screen.getByText('アラートの詳細説明');
    
    expect(alert).toContainElement(title);
    expect(alert).toContainElement(description);
    expect(title).toHaveClass('mb-1');
    expect(description).toHaveClass('text-sm');
  });
  
  it('AlertTitleにカスタムクラス名を適用する', () => {
    render(
      <Alert>
        <AlertTitle className="custom-title">カスタムタイトル</AlertTitle>
      </Alert>
    );
    
    const title = screen.getByText('カスタムタイトル');
    expect(title).toHaveClass('custom-title');
  });
  
  it('AlertDescriptionにカスタムクラス名を適用する', () => {
    render(
      <Alert>
        <AlertDescription className="custom-description">カスタム説明</AlertDescription>
      </Alert>
    );
    
    const description = screen.getByText('カスタム説明');
    expect(description).toHaveClass('custom-description');
  });
}); 