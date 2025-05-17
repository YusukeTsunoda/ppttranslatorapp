/**
 * ストリーミングI/Oユーティリティ
 * 大きなファイルを効率的に処理するためのストリーム処理機能を提供します
 */

import * as fs from 'fs';
import { Transform, pipeline, Readable } from 'stream';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import * as zlib from 'zlib';
import * as path from 'path'; // 圧縮ファイルの出力パス生成に使用

// pipelineをPromise化
const pipelineAsync = promisify(pipeline);

/**
 * バッファプールクラス
 * メモリ効率を向上させるためにバッファを再利用します
 */
export class BufferPool {
  private pool: Buffer[] = [];
  private size: number;
  private maxPoolSize: number;

  /**
   * コンストラクタ
   * @param size バッファサイズ（バイト）
   * @param maxPoolSize プール内の最大バッファ数
   */
  constructor(size: number = 64 * 1024, maxPoolSize: number = 10) {
    this.size = size;
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * バッファを取得
   * @returns バッファ
   */
  public get(): Buffer {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return Buffer.allocUnsafe(this.size);
  }

  /**
   * バッファを返却
   * @param buffer 返却するバッファ
   */
  public release(buffer: Buffer): void {
    if (buffer.length !== this.size) {
      return; // サイズが異なる場合は再利用しない
    }
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(buffer);
    }
  }

  /**
   * プールをクリア
   */
  public clear(): void {
    this.pool = [];
  }

  /**
   * プールサイズを取得
   */
  public getPoolSize(): number {
    return this.pool.length;
  }
}

/**
 * ストリーミングI/Oユーティリティクラス
 */
export class StreamingIO {
  private bufferPool: BufferPool;

  /**
   * コンストラクタ
   * @param bufferSize バッファサイズ（バイト）
   * @param maxPoolSize プール内の最大バッファ数
   */
  constructor(bufferSize: number = 64 * 1024, maxPoolSize: number = 10) {
    this.bufferPool = new BufferPool(bufferSize, maxPoolSize);
  }

  /**
   * ファイルをチャンク単位で読み込む
   * @param filePath ファイルパス
   * @param chunkSize チャンクサイズ（バイト）
   * @param callback チャンク処理コールバック
   */
  public async readFileInChunks(
    filePath: string,
    chunkSize: number,
    callback: (chunk: Buffer, index: number) => Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(filePath, {
        highWaterMark: chunkSize
      });

      let chunkIndex = 0;

      readStream.on('data', async (chunk) => {
        try {
          readStream.pause();
          // Buffer型に変換して処理
          if (Buffer.isBuffer(chunk)) {
            await callback(chunk, chunkIndex++);
          } else {
            await callback(Buffer.from(chunk), chunkIndex++);
          }
          readStream.resume();
        } catch (error) {
          readStream.destroy();
          reject(error);
        }
      });

      readStream.on('end', () => {
        resolve();
      });

      readStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * ストリームを使用してファイルをコピー
   * @param sourcePath ソースファイルパス
   * @param destPath 宛先ファイルパス
   * @param progressCallback 進捗コールバック
   */
  public async copyFile(
    sourcePath: string,
    destPath: string,
    progressCallback?: (bytesRead: number, totalBytes: number) => void
  ): Promise<void> {
    const totalBytes = fs.statSync(sourcePath).size;
    let bytesRead = 0;

    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath);

    // 進捗を報告するTransformストリーム
    const progressStream = new Transform({
      transform: (chunk, _encoding, callback) => {
        bytesRead += chunk.length;
        if (progressCallback) {
          progressCallback(bytesRead, totalBytes);
        }
        callback(null, chunk);
      }
    });

    return pipelineAsync(readStream, progressStream, writeStream);
  }

  /**
   * 外部から提供されたバッファを使用してファイルをコピー
   * @param sourcePath ソースファイルパス
   * @param destPath 宛先ファイルパス
   * @param buffer 使用するバッファ
   * @param progressCallback 進捗コールバック
   */
  public async copyFileWithBuffer(
    sourcePath: string,
    destPath: string,
    buffer: Buffer,
    progressCallback?: (bytesRead: number, totalBytes: number) => void
  ): Promise<void> {
    const totalBytes = fs.statSync(sourcePath).size;
    let bytesRead = 0;
    
    return new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath, { highWaterMark: buffer.length });
      const writeStream = fs.createWriteStream(destPath);
      
      readStream.on('data', (chunk) => {
        // チャンクがBuffer型か確認し、必要に応じて変換
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        
        // チャンクを外部バッファにコピー
        const length = Math.min(bufferChunk.length, buffer.length);
        bufferChunk.copy(buffer, 0, 0, length);
        
        // バッファから書き込み
        writeStream.write(buffer.subarray(0, length));
        
        bytesRead += length;
        if (progressCallback) {
          progressCallback(bytesRead, totalBytes);
        }
      });
      
      readStream.on('end', () => {
        writeStream.end();
        resolve();
      });
      
      readStream.on('error', (err) => {
        writeStream.end();
        reject(err);
      });
      
      writeStream.on('error', (err) => {
        readStream.destroy();
        reject(err);
      });
    });
  }

  /**
   * ファイルを圧縮
   * @param sourcePath ソースファイルパス
   * @param destPath 宛先ファイルパス（.gz拡張子が自動的に追加されます）
   */
  public async compressFile(sourcePath: string, destPath: string): Promise<void> {
    const gzip = zlib.createGzip();
    const source = createReadStream(sourcePath);
    const destination = createWriteStream(`${destPath}.gz`);

    return pipelineAsync(source, gzip, destination);
  }

  /**
   * 圧縮ファイルを解凍
   * @param sourcePath ソースファイルパス（.gz拡張子付き）
   * @param destPath 宛先ファイルパス
   */
  public async decompressFile(sourcePath: string, destPath: string): Promise<void> {
    const gunzip = zlib.createGunzip();
    const source = createReadStream(sourcePath);
    const destination = createWriteStream(destPath);

    return pipelineAsync(source, gunzip, destination);
  }

  /**
   * バッファプールを取得
   */
  public getBufferPool(): BufferPool {
    return this.bufferPool;
  }

  /**
   * リソースを解放
   */
  public dispose(): void {
    this.bufferPool.clear();
  }

  /**
   * バッファプールを使用してデータを変換する
   * @param inputStream 入力ストリーム
   * @param transformFn 変換関数
   * @returns 出力ストリーム
   */
  public createTransformStream(transformFn: (data: Buffer) => Buffer): Transform {
    // バッファプールを作成し、メモリ効率を向上
    const bufferPool = new BufferPool();
    
    return new Transform({
      transform(chunk: Buffer | string, _encoding: string, callback: (error: Error | null, data?: Buffer) => void) {
        try {
          // バッファプールからバッファを取得
          const buffer = bufferPool.get();
          
          // 入力チャンクを変換
          const transformedChunk = transformFn(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback(null, transformedChunk);
          
          // バッファをプールに返却
          bufferPool.release(buffer);
        } catch (error) {
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  }
}

/**
 * ストリームからデータを読み込み、バッファに格納
 * @param stream 読み込むストリーム
 * @returns バッファ
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    stream.on('data', (chunk) => {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    });
    
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    stream.on('error', reject);
  });
}

/**
 * バッファをストリームに変換
 * @param buffer バッファ
 * @returns 読み込みストリーム
 */
export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * ファイルをストリームで読み込み、指定された関数で処理
 * @param filePath ファイルパス
 * @param processor 処理関数
 */
export async function processFileStream<T>(
  filePath: string,
  processor: (stream: Readable) => Promise<T>
): Promise<T> {
  const stream = createReadStream(filePath);
  try {
    return await processor(stream);
  } finally {
    stream.destroy();
  }
}
