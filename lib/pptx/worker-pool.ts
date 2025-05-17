/**
 * Worker Threads APIを使用した並列処理フレームワーク
 * PPTXファイルの解析処理を並列化するためのワーカープールを提供します
 */

import { Worker, isMainThread, parentPort } from 'worker_threads';
import * as os from 'os';

// ワーカータスクの型定義
export interface WorkerTask {
  type: string;
  data: any;
  id: string;
}

// ワーカー結果の型定義
export interface WorkerResult {
  taskId: string;
  result: any;
  error?: Error;
}

/**
 * ワーカープールクラス
 * 複数のワーカースレッドを管理し、タスクを分散して実行します
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private queue: WorkerTask[] = [];
  private activeWorkers: Map<string, Worker> = new Map();
  private callbacks: Map<string, { resolve: Function; reject: Function }> = new Map();
  private workerScript: string;
  private maxWorkers: number;
  private isInitialized: boolean = false;

  /**
   * コンストラクタ
   * @param workerScript ワーカースクリプトのパス
   * @param maxWorkers 最大ワーカー数（デフォルトはCPUコア数-1）
   */
  constructor(workerScript: string, maxWorkers?: number) {
    this.workerScript = workerScript;
    this.maxWorkers = maxWorkers || Math.max(1, os.cpus().length - 1);
  }

  /**
   * ワーカープールを初期化
   */
  public initialize(): void {
    if (this.isInitialized) return;

    for (let i = 0; i < this.maxWorkers; i++) {
      this.addNewWorker();
    }

    this.isInitialized = true;
    console.log(`ワーカープールを初期化しました（ワーカー数: ${this.maxWorkers}）`);
  }

  /**
   * 新しいワーカーを追加
   */
  private addNewWorker(): void {
    const worker = new Worker(this.workerScript);

    worker.on('message', (result: WorkerResult) => {
      // タスク完了時のコールバック処理
      const callback = this.callbacks.get(result.taskId);
      if (callback) {
        if (result.error) {
          callback.reject(result.error);
        } else {
          callback.resolve(result.result);
        }
        this.callbacks.delete(result.taskId);
      }

      // ワーカーをアクティブリストから削除
      this.activeWorkers.delete(result.taskId);

      // 次のタスクを処理
      if (this.queue.length > 0) {
        const nextTask = this.queue.shift()!;
        this.executeTask(worker, nextTask);
      }
    });

    worker.on('error', (err) => {
      console.error('ワーカーエラー:', err);
      // エラーが発生したワーカーを置き換え
      this.workers = this.workers.filter(w => w !== worker);
      this.addNewWorker();
    });

    this.workers.push(worker);
  }

  /**
   * ワーカーでタスクを実行
   * @param worker ワーカー
   * @param task タスク
   */
  private executeTask(worker: Worker, task: WorkerTask): void {
    this.activeWorkers.set(task.id, worker);
    worker.postMessage(task);
  }

  /**
   * タスクをキューに追加して実行
   * @param taskType タスクタイプ
   * @param taskData タスクデータ
   * @returns タスク結果のPromise
   */
  public runTask(taskType: string, taskData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // 初期化されていない場合は初期化
      if (!this.isInitialized) {
        this.initialize();
      }

      const taskId = `${taskType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const task: WorkerTask = {
        type: taskType,
        data: taskData,
        id: taskId
      };

      // コールバックを保存
      this.callbacks.set(taskId, { resolve, reject });

      // 利用可能なワーカーがあれば直接実行、なければキューに追加
      const availableWorker = this.workers.find(worker => 
        !Array.from(this.activeWorkers.values()).includes(worker)
      );

      if (availableWorker) {
        this.executeTask(availableWorker, task);
      } else {
        this.queue.push(task);
      }
    });
  }

  /**
   * 全てのワーカーを終了
   */
  public async terminate(): Promise<void> {
    // 全てのワーカーを終了
    const terminationPromises = this.workers.map(worker => worker.terminate());
    await Promise.all(terminationPromises);
    
    // 状態をリセット
    this.workers = [];
    this.queue = [];
    this.activeWorkers.clear();
    this.callbacks.clear();
    this.isInitialized = false;
    
    console.log('全てのワーカーを終了しました');
  }

  /**
   * アクティブなワーカー数を取得
   */
  public getActiveWorkerCount(): number {
    return this.activeWorkers.size;
  }

  /**
   * キューに残っているタスク数を取得
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * ワーカープールの状態情報を取得
   */
  public getStatus(): { 
    totalWorkers: number; 
    activeWorkers: number; 
    queueLength: number;
    isInitialized: boolean;
  } {
    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.activeWorkers.size,
      queueLength: this.queue.length,
      isInitialized: this.isInitialized
    };
  }
}

/**
 * ワーカースレッド内で実行される処理
 * このコードはワーカースレッド内でのみ実行されます
 */
export function setupWorker(handlers: Record<string, (data: any) => Promise<any>>): void {
  if (isMainThread) {
    return; // メインスレッドでは何もしない
  }

  // ワーカースレッドからのメッセージを処理
  parentPort?.on('message', async (task: WorkerTask) => {
    try {
      // タスクタイプに対応するハンドラを取得
      const handler = handlers[task.type];
      if (!handler) {
        throw new Error(`不明なタスクタイプ: ${task.type}`);
      }

      // ハンドラを実行
      const result = await handler(task.data);

      // 結果を送信
      parentPort?.postMessage({
        taskId: task.id,
        result
      });
    } catch (error) {
      // エラーを送信
      parentPort?.postMessage({
        taskId: task.id,
        result: null,
        error: error instanceof Error ? 
          { message: error.message, stack: error.stack } : 
          { message: String(error) }
      });
    }
  });

  console.log('ワーカースレッドが初期化されました');
}
