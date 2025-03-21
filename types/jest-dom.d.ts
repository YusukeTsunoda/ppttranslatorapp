/// <reference types="jest" />

// @testing-library/jest-dom の型定義拡張
declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    toHaveClass(className: string): R;
    toBeDisabled(): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveProperty(keyPath: string, value?: any): R;
    toContainElement(element: HTMLElement | null): R;
    toBeVisible(): R;
    toBeChecked(): R;
    toBeEmpty(): R;
    toHaveValue(value?: string | string[] | number): R;
    toHaveStyle(css: string | object): R;
    toHaveFocus(): R;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
  }
}
