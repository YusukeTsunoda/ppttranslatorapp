import '@testing-library/jest-dom';

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

  // グローバルのユーティリティ関数を定義
  function __mockReaddir(files: string[]): void;
  function __mockExistsSync(exists: boolean): void;
  function __mockMkdir(implementationFn?: Function): void;
  function waitForNextTick(): Promise<void>;
}

// Jestのグローバル関数の型定義を拡張
declare global {
  namespace jest {
    interface Expect {
      extend(matchers: Record<string, any>): void;
    }
  }
}

// Jestのアサーションの型定義を拡張
interface Assertion {
  toBe(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toEqual(expected: any): void;
  toStrictEqual(expected: any): void;
  toContain(expected: any): void;
  toHaveLength(expected: number): void;
  toHaveProperty(property: string, value?: any): void;
  toMatch(expected: string | RegExp): void;
  toMatchObject(expected: object): void;
  toThrow(expected?: string | Error | RegExp): void;
  toThrowError(expected?: string | Error | RegExp): void;
  toBeInstanceOf(expected: any): void;
  not: Assertion;

  // モック関数用のアサーション
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(times: number): void;
  toHaveBeenCalledWith(...args: any[]): void;
  toHaveBeenLastCalledWith(...args: any[]): void;
  toHaveBeenNthCalledWith(time: number, ...args: any[]): void;
  toHaveReturned(): void;
  toHaveReturnedTimes(times: number): void;
  toHaveReturnedWith(value: any): void;
  toHaveLastReturnedWith(value: any): void;
  toHaveNthReturnedWith(time: number, value: any): void;

  // DOM関連
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

interface AsyncAssertion {
  // AsyncAssertionがAssertionの全てのプロパティを継承するように修正
  toBe(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toEqual(expected: any): void;
  toStrictEqual(expected: any): void;
  toContain(expected: any): void;
  toHaveLength(expected: number): void;
  toHaveProperty(property: string, value?: any): void;
  toMatch(expected: string | RegExp): void;
  toMatchObject(expected: object): void;
  toThrow(expected?: string | Error | RegExp): void;
  toThrowError(expected?: string | Error | RegExp): void;
  toBeInstanceOf(expected: any): void;
  not: AsyncAssertion;

  // モック関数用のアサーション
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(times: number): void;
  toHaveBeenCalledWith(...args: any[]): void;
  toHaveBeenLastCalledWith(...args: any[]): void;
  toHaveBeenNthCalledWith(time: number, ...args: any[]): void;
  toHaveReturned(): void;
  toHaveReturnedTimes(times: number): void;
  toHaveReturnedWith(value: any): void;
  toHaveLastReturnedWith(value: any): void;
  toHaveNthReturnedWith(time: number, value: any): void;

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

  // 非同期アサーション専用
  rejects: Assertion;
  resolves: Assertion;
  toResolve(): void;
  toReject(): void;
}

declare global {
  namespace jest {
    interface Expect {
      assertions(count: number): void;
      extend(matchers: Record<string, any>): void;
      anything(): any;
      any(constructor: Function): any;
      arrayContaining(arr: Array<any>): any;
      objectContaining(obj: object): any;
      stringContaining(str: string): any;
      stringMatching(str: string | RegExp): any;
      not: {
        arrayContaining(arr: Array<any>): any;
        objectContaining(obj: object): any;
        stringContaining(str: string): any;
        stringMatching(str: string | RegExp): any;
      };

      // 基本的なアサーション関数
      (value: any): Assertion & AsyncAssertion;
    }
  }

  const expect: jest.Expect;
}

export {};
