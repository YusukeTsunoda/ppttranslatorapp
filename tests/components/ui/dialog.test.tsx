import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogClose,
} from '@/components/ui/dialog';
import '@testing-library/jest-dom';

// Radixコンポーネントのモック
jest.mock('@radix-ui/react-dialog', () => {
  const original = jest.requireActual('@radix-ui/react-dialog');
  return {
    ...original,
    Root: ({ children, open, onOpenChange }: any) => (
      <div data-testid="dialog-root" data-open={open} onClick={() => onOpenChange && onOpenChange(!open)}>
        {children}
      </div>
    ),
    Trigger: ({ children }: any) => <button data-testid="dialog-trigger">{children}</button>,
    Portal: ({ children }: any) => <div data-testid="dialog-portal">{children}</div>,
    Overlay: React.forwardRef(({ children, className, ...props }: any, ref) => (
      <div data-testid="dialog-overlay" className={className} {...props} ref={ref}>
        {children}
      </div>
    )),
    Content: React.forwardRef(({ children, className, ...props }: any, ref) => (
      <div data-testid="dialog-content" className={className} {...props} ref={ref}>
        {children}
      </div>
    )),
    Title: React.forwardRef(({ children, className, ...props }: any, ref) => (
      <h2 data-testid="dialog-title" className={className} {...props} ref={ref}>
        {children}
      </h2>
    )),
    Description: React.forwardRef(({ children, className, ...props }: any, ref) => (
      <p data-testid="dialog-description" className={className} {...props} ref={ref}>
        {children}
      </p>
    )),
    Close: ({ children }: any) => <button data-testid="dialog-close">{children}</button>,
  };
});

describe('Dialog', () => {
  it('すべてのコンポーネントが正しくレンダリングされること', () => {
    render(
      <Dialog>
        <DialogTrigger>ダイアログを開く</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ダイアログタイトル</DialogTitle>
            <DialogDescription>
              これはダイアログの説明です。
            </DialogDescription>
          </DialogHeader>
          <div>ダイアログの内容</div>
          <DialogFooter>
            <DialogClose>閉じる</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('ダイアログを開く')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-root')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-portal')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('ダイアログタイトル');
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('これはダイアログの説明です。');
    expect(screen.getAllByTestId('dialog-close')).toHaveLength(2);
  });

  it('クラス名が正しく適用されること', () => {
    render(
      <Dialog>
        <DialogContent className="custom-content">
          <DialogHeader className="custom-header">
            <DialogTitle className="custom-title">タイトル</DialogTitle>
            <DialogDescription className="custom-description">説明</DialogDescription>
          </DialogHeader>
          <DialogFooter className="custom-footer">
            <DialogClose>閉じる</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('dialog-content').className).toContain('custom-content');
    expect(screen.getByTestId('dialog-title').className).toContain('custom-title');
    expect(screen.getByTestId('dialog-description').className).toContain('custom-description');
  });
}); 