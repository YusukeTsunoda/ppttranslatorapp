// グローバル型定義ファイル
import '@testing-library/jest-dom';

// Jestのアサーション型を拡張
interface Assertion {
  // DOM関連のアサーション
  toBeInTheDocument(): void;
  toHaveAttribute(attr: string, value?: string): void;
  toHaveTextContent(text: string | RegExp): void;
  toHaveValue(value: string | RegExp): void;
  toHaveStyle(style: Record<string, any>): void;
  toBeVisible(): void;
  toBeDisabled(): void;
  toBeEnabled(): void;
  toBeChecked(): void;
  toBeEmpty(): void;
  toBeEmptyDOMElement(): void;
  toBeInvalid(): void;
  toBeRequired(): void;
  toBeValid(): void;
  toContainElement(element: HTMLElement | null): void;
  toContainHTML(html: string): void;
  toHaveClass(...classNames: string[]): void;
  toHaveFocus(): void;
  toHaveFormValues(values: Record<string, any>): void;
  toBeInTheDOM(): void;
}

// グローバル名前空間の拡張
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: string | RegExp): R;
      toHaveStyle(style: Record<string, any>): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeChecked(): R;
      toBeEmpty(): R;
      toBeEmptyDOMElement(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(html: string): R;
      toHaveClass(...classNames: string[]): R;
      toHaveFocus(): R;
      toHaveFormValues(values: Record<string, any>): R;
      toBeInTheDOM(): R;
    }
  }
}

export {};
