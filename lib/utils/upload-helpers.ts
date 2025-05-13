/**
 * ファイルアップロード処理のためのヘルパーユーティリティ
 * 
 * formidable v3.5.xを使用したファイルアップロード処理を簡単に行うための関数を提供します。
 */

import * as formidable from 'formidable';
import { IncomingMessage } from 'http';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FormidablePromise } from '@/types/formidable';

// アップロードディレクトリの初期化
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * 一時アップロードディレクトリを作成
 * @param userId ユーザーID（ディレクトリ分離のため）
 * @returns アップロードディレクトリのパス
 */
export async function createUploadDir(userId: string): Promise<string> {
  const userUploadDir = path.join(UPLOAD_DIR, userId);
  
  if (!existsSync(userUploadDir)) {
    await mkdir(userUploadDir, { recursive: true });
  }
  
  return userUploadDir;
}

/**
 * フォームのファイルをパースするための基本オプション
 */
export const defaultFormOptions: formidable.Options = {
  keepExtensions: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFields: 10,
  maxFieldsSize: 1 * 1024 * 1024, // 1MB
  hash: 'sha256',
  multiples: true,
};

/**
 * IncomingMessageからフォームデータをパース
 * @param req HTTPリクエスト
 * @param options formidableオプション
 * @returns Promise<[フィールド, ファイル]>
 */
export async function parseForm(
  req: IncomingMessage,
  options: Partial<formidable.Options> = {}
): FormidablePromise {
  return new Promise((resolve, reject) => {
    // formidable v3の構文
    const form = formidable({
      ...defaultFormOptions,
      ...options,
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve([fields, files]);
    });
  });
}

/**
 * ユーザー専用の一時ディレクトリにファイルをアップロード
 * @param req HTTPリクエスト
 * @param userId ユーザーID
 * @returns Promise<[フィールド, ファイル]>
 */
export async function uploadFilesToUserDir(
  req: IncomingMessage,
  userId: string
): FormidablePromise {
  const uploadDir = await createUploadDir(userId);
  
  // タイムスタンプをファイル名に追加
  const timestamp = Date.now();
  
  const form = formidable({
    ...defaultFormOptions,
    uploadDir,
    filename: (_name, ext) => {
      return `${timestamp}_${uuidv4()}${ext}`;
    }
  });
  
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve([fields, files]);
    });
  });
}

/**
 * ファイルオブジェクトからファイル情報を抽出
 * @param file formidableのFileオブジェクト
 * @returns ファイル情報
 */
export function extractFileInfo(file: formidable.File) {
  return {
    filepath: file.filepath,
    originalFilename: file.originalFilename || 'unknown',
    newFilename: file.newFilename,
    size: file.size,
    mimetype: file.mimetype || 'application/octet-stream',
    hash: file.hash || undefined,
  };
}

/**
 * 複数ファイルを処理（単一ファイルと配列の両方に対応）
 * @param files formidableのファイルオブジェクト
 * @param fieldName 処理するフィールド名
 * @returns 処理済みファイル情報の配列
 */
export function processFiles(files: formidable.Files, fieldName: string = 'file') {
  const fileField = files[fieldName];
  
  if (!fileField) {
    return [];
  }
  
  // 単一ファイルと配列の両方に対応
  const fileArray = Array.isArray(fileField) ? fileField : [fileField];
  
  return fileArray.map(extractFileInfo);
} 