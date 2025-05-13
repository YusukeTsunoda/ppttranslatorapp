/**
 * formidableライブラリ（v3.5.x）のための拡張型定義
 * 
 * 公式の@types/formidableでカバーされていない型や、
 * バージョン固有の機能に対する型定義を提供します。
 */

import * as formidable from 'formidable';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

declare module 'formidable' {
  // File型の拡張
  export interface File {
    filepath: string;
    originalFilename: string | null;
    newFilename: string;
    mimetype: string | null;
    size: number;
    hashAlgorithm: false | 'sha1' | 'md5' | 'sha256';
    hash?: string;
    toJSON(): FileJSON;
  }

  export interface FileJSON {
    size: number;
    filepath: string;
    originalFilename?: string;
    newFilename?: string;
    mimetype?: string;
    mtime?: Date;
    hashAlgorithm?: string;
    hash?: string;
  }

  // オプションの拡張
  export interface Options {
    encoding?: string;
    uploadDir?: string;
    keepExtensions?: boolean;
    allowEmptyFiles?: boolean;
    minFileSize?: number;
    maxFileSize?: number;
    maxFields?: number;
    maxFieldsSize?: number;
    maxTotalFileSize?: number;
    hash?: false | 'sha1' | 'md5' | 'sha256';
    multiples?: boolean;
    filename?: (name: string, ext: string, part: formidable.Part, form: formidable.BaseForm) => string;
    filter?: (part: formidable.Part) => boolean;
    enabledPlugins?: string[];
    fileWriteStreamHandler?: (file: formidable.File) => any;
  }

  // フォーム解析結果の型
  export interface FormParseResult {
    fields: formidable.Fields;
    files: formidable.Files;
  }

  // 拡張されたFormデータ型
  export interface Fields {
    [key: string]: string | string[];
  }

  export interface Files {
    [key: string]: formidable.File | formidable.File[];
  }

  // promise対応のパース関数型
  export interface Form {
    parse(req: IncomingMessage): Promise<[Fields, Files]>;
    parse(req: IncomingMessage, callback: (err: any, fields: Fields, files: Files) => any): void;
  }

  // formidable v3形式のヘルパーメソッド
  export function formidable(options?: formidable.Options): formidable.Form;
}

// IncomingMessage拡張型（formidableのreqパース用）
declare module 'http' {
  interface IncomingMessage {
    _readableState?: {
      buffer?: {
        length?: number;
      };
    };
  }
}

// 便利なユーティリティ型
export type FormidablePromise = Promise<[formidable.Fields, formidable.Files]>;
export type FormidableCallback = (err: any, fields: formidable.Fields, files: formidable.Files) => void; 