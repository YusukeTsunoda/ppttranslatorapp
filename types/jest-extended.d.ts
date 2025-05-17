/// <reference types="jest" />

// Jestのモック関数の型定義拡張
declare namespace jest {
  // モック関数の型定義を拡張
  interface MockInstance<T extends (...args: any[]) => any, Y extends any[]> {
    /**
     * モック関数が特定の引数で呼び出されたかどうかを検証します
     */
    toHaveBeenCalledWith(...args: Parameters<T>): void;
    
    /**
     * モック関数が正確に1回だけ呼び出されたかどうかを検証します
     */
    toHaveBeenCalledTimes(expected: number): void;
    
    /**
     * モック関数が呼び出されたかどうかを検証します
     */
    toHaveBeenCalled(): void;
    
    /**
     * モック関数が呼び出されていないことを検証します
     */
    not: {
      toHaveBeenCalled(): void;
      toHaveBeenCalledWith(...args: Parameters<T>): void;
      toHaveBeenCalledTimes(expected: number): void;
    };
  }

  // グローバルモック関数の型定義
  interface FunctionLike {
    readonly name: string;
  }

  // モック関数の戻り値の型を指定するための型定義
  interface Mock<T extends (...args: any[]) => any> extends Function {
    new (...args: any[]): any;
    (...args: Parameters<T>): ReturnType<T>;
    mockImplementation(fn: (...args: Parameters<T>) => ReturnType<T>): this;
    mockReturnValue(value: ReturnType<T>): this;
    mockReturnValueOnce(value: ReturnType<T>): this;
    mockResolvedValue(value: Awaited<ReturnType<T>>): this;
    mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this;
    mockRejectedValue(value: any): this;
    mockRejectedValueOnce(value: any): this;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): this;
  }
}

// グローバルのモックヘルパー関数の型定義
declare global {
  /**
   * モックファイルを作成するヘルパー関数
   */
  function mockFile(name: string, size: number, type: string, lastModified?: Date): File;
}

export {};
