# パフォーマンスチューニングガイド

## 概要

このガイドでは、翻訳システムのパフォーマンスを最適化するための方法について説明します。

## パフォーマンス指標

### 1. レイテンシー

- 目標値：
  - API応答時間: < 200ms
  - 翻訳処理時間: < 5秒/ページ
  - ファイルアップロード: < 3秒

### 2. スループット

- 目標値：
  - 同時翻訳処理: 10件/秒
  - ファイル処理: 100MB/秒
  - API要求: 1000req/秒

### 3. リソース使用量

- 目標値：
  - メモリ使用率: < 80%
  - CPU使用率: < 70%
  - ディスク使用率: < 85%

## 最適化戦略

### 1. キャッシュ最適化

#### メモリキャッシュ

```typescript
interface CacheConfig {
  maxSize: number;        // 最大キャッシュサイズ
  ttl: number;           // エントリーの有効期間
  cleanupInterval: number; // クリーンアップ間隔
}

class MemoryCache {
  private static instance: MemoryCache;
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
    this.startCleanup();
  }

  private startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  set(key: string, value: any): void {
    // キャッシュサイズの制限
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  private evictOldest(): void {
    let oldest = Date.now();
    let oldestKey = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
```

#### Redisキャッシュ

```typescript
class RedisCache {
  private redis: Redis;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true
    });
    this.config = config;
  }

  async set(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.set(key, serialized, 'EX', this.config.ttl);
  }

  async get(key: string): Promise<any | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async cleanup(): Promise<void> {
    // TTLが切れたキーの削除
    const keys = await this.redis.keys('*');
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        await this.redis.del(key);
      }
    }
  }
}
```

### 2. 並行処理の最適化

#### ワーカープール

```typescript
class WorkerPool {
  private workers: Worker[];
  private queue: Queue;
  private config: WorkerConfig;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.workers = this.initializeWorkers();
    this.queue = new Queue({
      concurrency: this.config.maxWorkers
    });
  }

  private initializeWorkers(): Worker[] {
    const workers = [];
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = new Worker('./translation-worker.js', {
        workerData: {
          id: i,
          maxMemory: this.config.maxMemoryPerWorker
        }
      });
      workers.push(worker);
    }
    return workers;
  }

  async processJob(job: TranslationJob): Promise<void> {
    return this.queue.add(async () => {
      const worker = this.getAvailableWorker();
      return new Promise((resolve, reject) => {
        worker.postMessage(job);
        worker.once('message', resolve);
        worker.once('error', reject);
      });
    });
  }

  private getAvailableWorker(): Worker {
    // 最も負荷の低いワーカーを選択
    return this.workers.reduce((prev, current) => {
      return current.performance.memory < prev.performance.memory ? current : prev;
    });
  }
}
```

#### バッチ処理

```typescript
class BatchProcessor {
  private batchSize: number;
  private timeout: number;
  private queue: any[];

  constructor(config: BatchConfig) {
    this.batchSize = config.batchSize;
    this.timeout = config.timeout;
    this.queue = [];
  }

  async addToBatch(item: any): Promise<void> {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    const batch = this.queue.splice(0, this.batchSize);
    
    // バッチ処理の実行
    const results = await Promise.all(
      batch.map(item => this.processItem(item))
    );

    // 結果の集計
    return this.aggregateResults(results);
  }

  private startTimeoutCheck(): void {
    setTimeout(async () => {
      if (this.queue.length > 0) {
        await this.processBatch();
      }
    }, this.timeout);
  }
}
```

### 3. メモリ管理

#### メモリリーク防止

```typescript
class MemoryManager {
  private maxMemory: number;
  private warningThreshold: number;

  constructor(config: MemoryConfig) {
    this.maxMemory = config.maxMemory;
    this.warningThreshold = config.warningThreshold;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      
      if (memoryUsage.heapUsed > this.warningThreshold) {
        this.cleanup();
      }
      
      if (memoryUsage.heapUsed > this.maxMemory) {
        this.handleOutOfMemory();
      }
    }, 1000);
  }

  private cleanup(): void {
    // 一時ファイルの削除
    this.cleanupTempFiles();
    
    // キャッシュのクリア
    this.clearUnusedCache();
    
    // 大きなオブジェクトの解放
    global.gc();
  }

  private handleOutOfMemory(): void {
    // プロセスの再起動
    process.exit(1);
  }
}
```

### 4. データベース最適化

#### インデックス最適化

```sql
-- 頻繁に使用されるクエリのインデックス
CREATE INDEX idx_translations_user_id ON translations(user_id);
CREATE INDEX idx_translations_created_at ON translations(created_at);
CREATE INDEX idx_translations_status ON translations(status);

-- 複合インデックス
CREATE INDEX idx_translations_user_status ON translations(user_id, status);

-- 部分インデックス
CREATE INDEX idx_active_translations ON translations(created_at)
WHERE status = 'active';
```

#### クエリ最適化

```typescript
class QueryOptimizer {
  static optimizeQuery(query: string): string {
    // クエリの分析
    const analysis = this.analyzeQuery(query);
    
    // 最適化ルールの適用
    if (analysis.hasFullTableScan) {
      query = this.addIndexHint(query);
    }
    
    if (analysis.hasInClause) {
      query = this.optimizeInClause(query);
    }
    
    return query;
  }

  static analyzeQuery(query: string): QueryAnalysis {
    // EXPLAINの実行
    const plan = this.getQueryPlan(query);
    
    return {
      hasFullTableScan: plan.includes('Seq Scan'),
      hasInClause: query.includes(' IN '),
      estimatedRows: this.extractEstimatedRows(plan)
    };
  }
}
```

### 5. ネットワーク最適化

#### 圧縮

```typescript
class CompressionMiddleware {
  static compress(req: Request, res: Response, next: NextFunction): void {
    // レスポンスサイズの確認
    if (res.getHeader('Content-Length') > 1024) {
      // gzip圧縮の適用
      const compressed = zlib.gzipSync(res.body);
      res.setHeader('Content-Encoding', 'gzip');
      res.body = compressed;
    }
    next();
  }
}
```

#### キャッシュヘッダー

```typescript
class CacheHeaderMiddleware {
  static setCacheHeaders(req: Request, res: Response, next: NextFunction): void {
    // 静的アセット
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    
    // API レスポンス
    else if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'private, no-cache');
    }
    
    next();
  }
}
```

## モニタリングと分析

### 1. パフォーマンスメトリクス

```typescript
class PerformanceMonitor {
  private metrics: {
    requestLatency: Histogram;
    throughput: Counter;
    errorRate: Gauge;
    memoryUsage: Gauge;
    cpuUsage: Gauge;
  };

  constructor() {
    this.initializeMetrics();
    this.startCollecting();
  }

  private initializeMetrics(): void {
    this.metrics = {
      requestLatency: new Histogram({
        name: 'request_latency',
        help: 'Request latency in milliseconds',
        buckets: [50, 100, 200, 500, 1000]
      }),
      throughput: new Counter({
        name: 'requests_total',
        help: 'Total number of requests'
      }),
      errorRate: new Gauge({
        name: 'error_rate',
        help: 'Current error rate'
      }),
      memoryUsage: new Gauge({
        name: 'memory_usage',
        help: 'Current memory usage'
      }),
      cpuUsage: new Gauge({
        name: 'cpu_usage',
        help: 'Current CPU usage'
      })
    };
  }

  recordMetrics(req: Request, res: Response): void {
    const latency = Date.now() - req.startTime;
    this.metrics.requestLatency.observe(latency);
    this.metrics.throughput.inc();
    
    if (res.statusCode >= 400) {
      this.metrics.errorRate.inc();
    }
  }
}
```

### 2. プロファイリング

```typescript
class Profiler {
  private profiles: Map<string, Profile>;

  startProfiling(name: string): void {
    this.profiles.set(name, {
      startTime: process.hrtime(),
      memory: process.memoryUsage()
    });
  }

  endProfiling(name: string): ProfileResult {
    const start = this.profiles.get(name);
    const end = {
      time: process.hrtime(start.startTime),
      memory: process.memoryUsage()
    };

    return {
      duration: end.time[0] * 1e9 + end.time[1],
      memoryDelta: {
        heapUsed: end.memory.heapUsed - start.memory.heapUsed,
        heapTotal: end.memory.heapTotal - start.memory.heapTotal
      }
    };
  }
}
```

## チューニングのベストプラクティス

1. 段階的な最適化
   - ボトルネックの特定
   - 測定可能な目標設定
   - 変更の影響を確認

2. キャッシュ戦略
   - 適切なTTLの設定
   - メモリ使用量の監視
   - 更新頻度の考慮

3. データベース最適化
   - 適切なインデックス設計
   - クエリの最適化
   - コネクションプールの調整

4. エラー処理
   - 適切なタイムアウト設定
   - リトライ戦略
   - エラーログの分析

5. 定期的なメンテナンス
   - パフォーマンス指標の監視
   - リソース使用量の確認
   - 定期的な最適化の実施 