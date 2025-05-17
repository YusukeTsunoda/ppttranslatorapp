"use strict";
/**
 * Worker Threads APIを使用した並列処理フレームワーク
 * PPTXファイルの解析処理を並列化するためのワーカープールを提供します
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
exports.setupWorker = setupWorker;
var worker_threads_1 = require("worker_threads");
var os = require("os");
/**
 * ワーカープールクラス
 * 複数のワーカースレッドを管理し、タスクを分散して実行します
 */
var WorkerPool = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param workerScript ワーカースクリプトのパス
     * @param maxWorkers 最大ワーカー数（デフォルトはCPUコア数-1）
     */
    function WorkerPool(workerScript, maxWorkers) {
        this.workers = [];
        this.queue = [];
        this.activeWorkers = new Map();
        this.callbacks = new Map();
        this.isInitialized = false;
        this.workerScript = workerScript;
        this.maxWorkers = maxWorkers || Math.max(1, os.cpus().length - 1);
    }
    /**
     * ワーカープールを初期化
     */
    WorkerPool.prototype.initialize = function () {
        if (this.isInitialized)
            return;
        for (var i = 0; i < this.maxWorkers; i++) {
            this.addNewWorker();
        }
        this.isInitialized = true;
        console.log("\u30EF\u30FC\u30AB\u30FC\u30D7\u30FC\u30EB\u3092\u521D\u671F\u5316\u3057\u307E\u3057\u305F\uFF08\u30EF\u30FC\u30AB\u30FC\u6570: ".concat(this.maxWorkers, "\uFF09"));
    };
    /**
     * 新しいワーカーを追加
     */
    WorkerPool.prototype.addNewWorker = function () {
        var _this = this;
        var worker = new worker_threads_1.Worker(this.workerScript);
        worker.on('message', function (result) {
            // タスク完了時のコールバック処理
            var callback = _this.callbacks.get(result.taskId);
            if (callback) {
                if (result.error) {
                    callback.reject(result.error);
                }
                else {
                    callback.resolve(result.result);
                }
                _this.callbacks.delete(result.taskId);
            }
            // ワーカーをアクティブリストから削除
            _this.activeWorkers.delete(result.taskId);
            // 次のタスクを処理
            if (_this.queue.length > 0) {
                var nextTask = _this.queue.shift();
                _this.executeTask(worker, nextTask);
            }
        });
        worker.on('error', function (err) {
            console.error('ワーカーエラー:', err);
            // エラーが発生したワーカーを置き換え
            _this.workers = _this.workers.filter(function (w) { return w !== worker; });
            _this.addNewWorker();
        });
        this.workers.push(worker);
    };
    /**
     * ワーカーでタスクを実行
     * @param worker ワーカー
     * @param task タスク
     */
    WorkerPool.prototype.executeTask = function (worker, task) {
        this.activeWorkers.set(task.id, worker);
        worker.postMessage(task);
    };
    /**
     * タスクをキューに追加して実行
     * @param taskType タスクタイプ
     * @param taskData タスクデータ
     * @returns タスク結果のPromise
     */
    WorkerPool.prototype.runTask = function (taskType, taskData) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            // 初期化されていない場合は初期化
            if (!_this.isInitialized) {
                _this.initialize();
            }
            var taskId = "".concat(taskType, "_").concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
            var task = {
                type: taskType,
                data: taskData,
                id: taskId
            };
            // コールバックを保存
            _this.callbacks.set(taskId, { resolve: resolve, reject: reject });
            // 利用可能なワーカーがあれば直接実行、なければキューに追加
            var availableWorker = _this.workers.find(function (worker) {
                return !Array.from(_this.activeWorkers.values()).includes(worker);
            });
            if (availableWorker) {
                _this.executeTask(availableWorker, task);
            }
            else {
                _this.queue.push(task);
            }
        });
    };
    /**
     * 全てのワーカーを終了
     */
    WorkerPool.prototype.terminate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var terminationPromises;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        terminationPromises = this.workers.map(function (worker) { return worker.terminate(); });
                        return [4 /*yield*/, Promise.all(terminationPromises)];
                    case 1:
                        _a.sent();
                        // 状態をリセット
                        this.workers = [];
                        this.queue = [];
                        this.activeWorkers.clear();
                        this.callbacks.clear();
                        this.isInitialized = false;
                        console.log('全てのワーカーを終了しました');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * アクティブなワーカー数を取得
     */
    WorkerPool.prototype.getActiveWorkerCount = function () {
        return this.activeWorkers.size;
    };
    /**
     * キューに残っているタスク数を取得
     */
    WorkerPool.prototype.getQueueLength = function () {
        return this.queue.length;
    };
    /**
     * ワーカープールの状態情報を取得
     */
    WorkerPool.prototype.getStatus = function () {
        return {
            totalWorkers: this.workers.length,
            activeWorkers: this.activeWorkers.size,
            queueLength: this.queue.length,
            isInitialized: this.isInitialized
        };
    };
    return WorkerPool;
}());
exports.WorkerPool = WorkerPool;
/**
 * ワーカースレッド内で実行される処理
 * このコードはワーカースレッド内でのみ実行されます
 */
function setupWorker(handlers) {
    var _this = this;
    if (worker_threads_1.isMainThread) {
        return; // メインスレッドでは何もしない
    }
    // ワーカースレッドからのメッセージを処理
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', function (task) { return __awaiter(_this, void 0, void 0, function () {
        var handler, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    handler = handlers[task.type];
                    if (!handler) {
                        throw new Error("\u4E0D\u660E\u306A\u30BF\u30B9\u30AF\u30BF\u30A4\u30D7: ".concat(task.type));
                    }
                    return [4 /*yield*/, handler(task.data)];
                case 1:
                    result = _a.sent();
                    // 結果を送信
                    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({
                        taskId: task.id,
                        result: result
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    // エラーを送信
                    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({
                        taskId: task.id,
                        result: null,
                        error: error_1 instanceof Error ?
                            { message: error_1.message, stack: error_1.stack } :
                            { message: String(error_1) }
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    console.log('ワーカースレッドが初期化されました');
}
