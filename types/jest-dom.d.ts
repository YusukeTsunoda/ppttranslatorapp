/// <reference types="jest" />

import '@testing-library/jest-dom';

// @testing-library/jest-dom の型定義拡張
declare global {
  namespace jest {
    interface Matchers<R, T = any> {
    // DOM要素関連のマッチャー
    toBeInTheDocument(): R;
    toHaveClass(className: string | string[]): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
    toBeRequired(): R;
    toBeValid(): R;
    toBeInvalid(): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveProperty(keyPath: string, value?: any): R;
    toContainElement(element: HTMLElement | null): R;
    toContainHTML(htmlText: string): R;
    toBeVisible(): R;
    toBeChecked(): R;
    toBePartiallyChecked(): R;
    toBeEmpty(): R;
    toHaveValue(value?: string | string[] | number): R;
    toHaveStyle(css: string | object): R;
    toHaveFocus(): R;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
    toHaveDescription(text?: string | RegExp): R;
    toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): R;
    toHaveFormValues(expectedValues: Record<string, any>): R;
    
    // カスタムマッチャー
    toHaveStatus(code: number): R;
    toHaveResponseJSON(json: object): R;
    toHaveBeenCalledWithObject(obj: Record<string, any>): R;
    toMatchAPIResponse(expected: object): R;
    toBeValidUser(): R;
    toBeValidFile(): R;
    toBeValidHistory(): R;
    toBeValidActivityLog(): R;
    }
  }
}

// グローバルのモックファイル関数の型定義
declare global {
  function mockFile(name: string, size: number, type: string, lastModified?: Date): File;
}
