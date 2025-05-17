// APIレスポンス用のカスタムマッチャー
import { NextResponse } from 'next/server';

// APIレスポンスのステータスコードを検証するマッチャー
expect.extend({
  /**
   * レスポンスが指定されたステータスコードを持っているかどうかを検証します
   */
  toHaveStatus(received: NextResponse, statusCode: number) {
    const pass = received.status === statusCode;
    if (pass) {
      return {
        message: () => `期待通り、レスポンスのステータスコードは ${statusCode} です`,
        pass: true,
      };
    } else {
      return {
        message: () => `レスポンスのステータスコードは ${received.status} ですが、${statusCode} が期待されていました`,
        pass: false,
      };
    }
  },

  /**
   * レスポンスのJSONが期待された形式かどうかを検証します
   */
  async toHaveResponseJSON(received: NextResponse, expectedJSON: object) {
    // レスポンスからJSONを取得
    let actualJSON;
    try {
      actualJSON = await received.json();
    } catch (error) {
      return {
        message: () => `レスポンスからJSONを取得できませんでした: ${error}`,
        pass: false,
      };
    }

    // JSONの比較
    const pass = this.equals(actualJSON, expectedJSON);
    if (pass) {
      return {
        message: () => `期待通り、レスポンスのJSONは ${JSON.stringify(expectedJSON)} です`,
        pass: true,
      };
    } else {
      return {
        message: () => 
          `レスポンスのJSONが期待と一致しません\n` +
          `期待: ${JSON.stringify(expectedJSON)}\n` +
          `実際: ${JSON.stringify(actualJSON)}`,
        pass: false,
      };
    }
  },

  /**
   * モック関数が特定のオブジェクトで呼び出されたかどうかを検証します
   */
  toHaveBeenCalledWithObject(received: jest.Mock, expectedObject: Record<string, any>) {
    // 呼び出し履歴を確認
    const calls = received.mock.calls;
    
    // 各呼び出しについて、期待されたオブジェクトのプロパティが含まれているかチェック
    const matchingCalls = calls.filter(call => {
      // 最初の引数をチェック（オブジェクトが期待される）
      const arg = call[0];
      if (!arg || typeof arg !== 'object') return false;
      
      // 期待されたオブジェクトの各プロパティをチェック
      return Object.entries(expectedObject).every(([key, value]) => {
        return this.equals(arg[key], value);
      });
    });
    
    const pass = matchingCalls.length > 0;
    if (pass) {
      return {
        message: () => `期待通り、関数は ${JSON.stringify(expectedObject)} を含むオブジェクトで呼び出されました`,
        pass: true,
      };
    } else {
      return {
        message: () => 
          `関数は ${JSON.stringify(expectedObject)} を含むオブジェクトで呼び出されていません\n` +
          `実際の呼び出し: ${JSON.stringify(calls.map(call => call[0]))}`,
        pass: false,
      };
    }
  },

  /**
   * APIレスポンスが期待された形式かどうかを検証します
   */
  async toMatchAPIResponse(received: NextResponse, expected: { status?: number; data?: any; error?: boolean }) {
    // ステータスコードの検証
    const statusPass = expected.status ? received.status === expected.status : true;
    
    // レスポンスデータの検証
    let dataPass = true;
    let actualData;
    
    if (expected.data !== undefined) {
      try {
        actualData = await received.json();
        dataPass = this.equals(actualData, expected.data);
      } catch (error) {
        dataPass = false;
      }
    }
    
    // エラーレスポンスの検証
    const errorPass = expected.error !== undefined ? 
      (expected.error === (received.status >= 400 && received.status < 600)) : 
      true;
    
    const pass = statusPass && dataPass && errorPass;
    
    if (pass) {
      return {
        message: () => `APIレスポンスは期待通りです`,
        pass: true,
      };
    } else {
      let message = `APIレスポンスが期待と一致しません\n`;
      
      if (!statusPass) {
        message += `ステータスコード: 期待=${expected.status}, 実際=${received.status}\n`;
      }
      
      if (!dataPass && expected.data !== undefined) {
        message += `データ: 期待=${JSON.stringify(expected.data)}, 実際=${JSON.stringify(actualData)}\n`;
      }
      
      if (!errorPass) {
        message += `エラー状態: 期待=${expected.error}, 実際=${received.status >= 400 && received.status < 600}\n`;
      }
      
      return {
        message: () => message,
        pass: false,
      };
    }
  },
});
