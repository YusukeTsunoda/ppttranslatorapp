import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      // 基本的なアサーション
      toBe(expected: any): R;
      toEqual(expected: any): R;
      toStrictEqual(expected: any): R;
      toBeNull(): R;
      toBeUndefined(): R;
      toBeDefined(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toBeNaN(): R;
      toBeGreaterThan(expected: number): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeLessThan(expected: number): R;
      toBeLessThanOrEqual(expected: number): R;
      toBeCloseTo(expected: number, precision?: number): R;
      toContain(expected: any): R;
      toContainEqual(expected: any): R;
      toHaveLength(expected: number): R;
      toHaveProperty(path: string, value?: any): R;
      toMatch(expected: string | RegExp): R;
      toMatchObject(expected: object): R;
      toThrow(expected?: string | Error | RegExp): R;
      toThrowError(expected?: string | Error | RegExp): R;

      // モック関数のアサーション
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(expected: number): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenLastCalledWith(...args: any[]): R;
      toHaveBeenNthCalledWith(nth: number, ...args: any[]): R;
      toHaveReturned(): R;
      toHaveReturnedTimes(expected: number): R;
      toHaveReturnedWith(expected: any): R;
      toHaveLastReturnedWith(expected: any): R;
      toHaveNthReturnedWith(nth: number, expected: any): R;

      // Testing Libraryのアサーション
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toBeChecked(): R;
      toBeRequired(): R;
      toHaveAttribute(attr: string, value?: any): R;
      toHaveClass(className: string): R;
      toHaveStyle(css: string): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: any): R;
      toHaveFocus(): R;
    }
  }
}
