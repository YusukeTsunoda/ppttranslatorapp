// Jest expect.extendの型定義拡張
import '@jest/expect';

declare global {
  namespace jest {
    interface Expect {
      extend(matchers: Record<string, any>): void;
    }
    
    interface ExpectStatic {
      extend(matchers: Record<string, any>): void;
    }
  }
}

export {};
