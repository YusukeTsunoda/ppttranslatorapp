// モデル検証用のカスタムマッチャー
import { User, File, TranslationHistory, ActivityLog } from '@prisma/client';

// モデル検証用のマッチャー
expect.extend({
  /**
   * 有効なユーザーモデルかどうかを検証します
   */
  toBeValidUser(received: any) {
    const requiredProps = ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'];
    const missingProps = requiredProps.filter(prop => !(prop in received));
    
    const pass = missingProps.length === 0;
    
    if (pass) {
      return {
        message: () => `オブジェクトは有効なユーザーモデルです`,
        pass: true,
      };
    } else {
      return {
        message: () => `オブジェクトは有効なユーザーモデルではありません。不足しているプロパティ: ${missingProps.join(', ')}`,
        pass: false,
      };
    }
  },
  
  /**
   * 有効なファイルモデルかどうかを検証します
   */
  toBeValidFile(received: any) {
    const requiredProps = ['id', 'userId', 'originalName', 'path', 'mimeType', 'size', 'status', 'createdAt', 'updatedAt'];
    const missingProps = requiredProps.filter(prop => !(prop in received));
    
    const pass = missingProps.length === 0;
    
    if (pass) {
      return {
        message: () => `オブジェクトは有効なファイルモデルです`,
        pass: true,
      };
    } else {
      return {
        message: () => `オブジェクトは有効なファイルモデルではありません。不足しているプロパティ: ${missingProps.join(', ')}`,
        pass: false,
      };
    }
  },
  
  /**
   * 有効な翻訳履歴モデルかどうかを検証します
   */
  toBeValidHistory(received: any) {
    const requiredProps = ['id', 'userId', 'fileId', 'sourceLanguage', 'targetLanguage', 'status', 'createdAt', 'updatedAt'];
    const missingProps = requiredProps.filter(prop => !(prop in received));
    
    const pass = missingProps.length === 0;
    
    if (pass) {
      return {
        message: () => `オブジェクトは有効な翻訳履歴モデルです`,
        pass: true,
      };
    } else {
      return {
        message: () => `オブジェクトは有効な翻訳履歴モデルではありません。不足しているプロパティ: ${missingProps.join(', ')}`,
        pass: false,
      };
    }
  },
  
  /**
   * 有効なアクティビティログモデルかどうかを検証します
   */
  toBeValidActivityLog(received: any) {
    const requiredProps = ['id', 'userId', 'type', 'detail', 'createdAt'];
    const missingProps = requiredProps.filter(prop => !(prop in received));
    
    const pass = missingProps.length === 0;
    
    if (pass) {
      return {
        message: () => `オブジェクトは有効なアクティビティログモデルです`,
        pass: true,
      };
    } else {
      return {
        message: () => `オブジェクトは有効なアクティビティログモデルではありません。不足しているプロパティ: ${missingProps.join(', ')}`,
        pass: false,
      };
    }
  },
});
