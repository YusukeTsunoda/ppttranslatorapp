/// <reference types="jest" />

// カスタムマッチャーの型定義
declare namespace jest {
  interface Matchers<R> {
    /**
     * オブジェクトが特定のプロパティと値を持っているかどうかを検証します
     */
    toHaveProperty<E = any>(propertyPath: string | Array<string>, value?: E): R;
    
    /**
     * 配列が特定の要素を含んでいるかどうかを検証します
     */
    toContain<E = any>(item: E): R;
    
    /**
     * オブジェクトが特定のプロパティを持っているかどうかを検証します（値は検証しない）
     */
    toHaveBeenCalledWithObject(obj: Record<string, any>): R;
    
    /**
     * 関数が特定の例外をスローするかどうかを検証します
     */
    toThrow(error?: string | Constructable | RegExp | Error): R;
    
    /**
     * 関数が特定のエラーメッセージを含む例外をスローするかどうかを検証します
     */
    toThrowError(error?: string | Constructable | RegExp | Error): R;
    
    /**
     * 値が特定の型であるかどうかを検証します
     */
    toBeInstanceOf(expected: any): R;
    
    /**
     * 値が特定の範囲内にあるかどうかを検証します
     */
    toBeGreaterThan(expected: number | bigint): R;
    toBeGreaterThanOrEqual(expected: number | bigint): R;
    toBeLessThan(expected: number | bigint): R;
    toBeLessThanOrEqual(expected: number | bigint): R;
    
    /**
     * 値が特定の値に近いかどうかを検証します
     */
    toBeCloseTo(expected: number, precision?: number): R;
    
    /**
     * オブジェクトが特定のオブジェクトと部分的に一致するかどうかを検証します
     */
    toMatchObject<E extends object | Array<any>>(expected: E): R;
    
    /**
     * 値が特定のスナップショットと一致するかどうかを検証します
     */
    toMatchSnapshot(propertyMatchers?: any, hint?: string): R;
    toMatchInlineSnapshot(propertyMatchers?: any, inlineSnapshot?: string): R;
  }
}

// コンストラクタブルな型の定義
interface Constructable {
  new (...args: any[]): any;
}

export {};
