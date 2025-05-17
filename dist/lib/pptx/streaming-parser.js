"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingPPTXParser = void 0;
/**
 * ストリーミング処理に対応したPPTXパーサー
 * メモリ効率と処理速度を向上させるために、ファイル全体をメモリに読み込まずに
 * ストリーミング処理を行う実装です。
 *
 * 最適化ポイント：
 * 1. Worker Threads APIを使用した並列処理
 * 2. ストリーミングI/Oによる効率的なファイル処理
 * 3. バッファプールによるメモリ最適化
 */
var fs = require("fs");
var path = require("path");
var uuid_1 = require("uuid"); // エラーIDの生成に使用
var os = require("os");
var python_shell_1 = require("python-shell");
var crypto = require("crypto");
var worker_pool_1 = require("./worker-pool");
var streaming_io_1 = require("./streaming-io");
var perf_hooks_1 = require("perf_hooks"); // パフォーマンス計測用
var fsPromises = fs.promises;
/**
 * ストリーミング処理に対応したPPTXパーサークラス
 */
var StreamingPPTXParser = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param options オプション
     */
    function StreamingPPTXParser(options) {
        if (options === void 0) { options = {}; }
        // クラスプロパティを確定的に初期化し、型エラーを回避する
        this.pythonPath = 'python3'; // デフォルト値を直接設定
        this.scriptPath = path.join(__dirname, '..', '..', 'python', 'pptx_parser.py');
        this.cacheExpirationTime = 3600 * 24; // 24時間
        this.parserCache = new Map();
        this.cacheDir = path.join(os.tmpdir(), 'pptx-parser-cache');
        this.batchSize = 10; // 一度に処理するスライド数
        // 並列処理関連
        this.maxWorkers = Math.max(1, Math.min(os.cpus().length - 1, 4)); // CPUコア数 - 1を上限に
        this.workerScriptPath = path.join(__dirname, 'pptx-worker.js');
        this.workerPool = null;
        // メモリ最適化関連
        this.bufferSize = 1024 * 1024; // 1MB
        this.bufferPool = null;
        this.streamingIO = null;
        // エラーログ
        this.errorLog = [];
        this.errorCount = {};
        this.maxErrorLogSize = 100;
        // クラスプロパティはすでにデフォルト値で初期化されているので、
        // オプションが指定された場合のみ上書きする
        if (options.pythonPath) {
            this.pythonPath = options.pythonPath;
        }
        if (options.scriptPath) {
            this.scriptPath = options.scriptPath;
        }
        if (options.cacheExpirationTime) {
            this.cacheExpirationTime = options.cacheExpirationTime;
        }
        if (options.batchSize) {
            this.batchSize = options.batchSize;
        }
        if (options.maxWorkers) {
            this.maxWorkers = options.maxWorkers;
        }
        if (options.bufferSize) {
            this.bufferSize = options.bufferSize;
        }
        if (options.workerScriptPath) {
            this.workerScriptPath = options.workerScriptPath;
        }
        // バッファプールを初期化
        this.bufferPool = new streaming_io_1.BufferPool(this.bufferSize, 10); // 10個のバッファを事前に確保
        // ストリーミングI/Oを初期化
        this.streamingIO = new streaming_io_1.StreamingIO();
    }
    /**
     * 並列処理用のワーカープールを初期化
     */
    StreamingPPTXParser.prototype.initializeWorkerPool = function () {
        if (this.workerPool) {
            return; // すでに初期化されている場合は何もしない
        }
        try {
            this.workerPool = new worker_pool_1.WorkerPool(this.workerScriptPath, this.maxWorkers);
            console.log("\u30EF\u30FC\u30AB\u30FC\u30D7\u30FC\u30EB\u3092\u521D\u671F\u5316\u3057\u307E\u3057\u305F\uFF08\u6700\u5927\u30EF\u30FC\u30AB\u30FC\u6570: ".concat(this.maxWorkers, "\uFF09"));
        }
        catch (error) {
            console.error('ワーカープールの初期化に失敗しました:', error);
            this.logError('initializeWorkerPool', error, null, 'medium', false);
        }
    };
    /**
     * 並列処理を使用してスライドを解析
     * @param inputPath 入力ファイルパス
     * @param outputDir 出力ディレクトリ
     * @param slideCount スライド数
     * @returns 解析結果の配列
     */
    StreamingPPTXParser.prototype.parseSlidesConcurrently = function (inputPath, outputDir, slideCount) {
        return __awaiter(this, void 0, void 0, function () {
            var results, _loop_1, this_1, i;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // ワーカープールを初期化
                        this.initializeWorkerPool();
                        if (!this.workerPool) {
                            throw new Error('ワーカープールの初期化に失敗しました');
                        }
                        results = new Array(slideCount);
                        _loop_1 = function (i) {
                            var batchEnd, batch, batchPromises, batchResults, j, index, result;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        batchEnd = Math.min(i + this_1.batchSize, slideCount);
                                        batch = Array.from({ length: batchEnd - i }, function (_, j) { return i + j; });
                                        batchPromises = batch.map(function (slideIndex) {
                                            // WorkerPoolのrunTaskメソッドを使用
                                            if (_this.workerPool) {
                                                try {
                                                    // ワーカープールにタスクを送信し、Promiseを取得
                                                    return _this.workerPool.runTask('parseSlide', {
                                                        inputPath: inputPath,
                                                        outputDir: outputDir,
                                                        slideIndex: slideIndex,
                                                        pythonPath: _this.pythonPath,
                                                        scriptPath: _this.scriptPath
                                                    }).then(function (result) {
                                                        // 結果をSlideContent型に変換
                                                        return result;
                                                    }).catch(function (error) {
                                                        console.error("\u30B9\u30E9\u30A4\u30C9\u89E3\u6790\u30A8\u30E9\u30FC (".concat(slideIndex, "):"), error);
                                                        // エラー時は空のスライドを返す
                                                        return {
                                                            index: slideIndex,
                                                            imageUrl: '',
                                                            textElements: [],
                                                            shapes: [],
                                                            background: {
                                                                color: '#FFFFFF'
                                                            }
                                                        };
                                                    });
                                                }
                                                catch (error) {
                                                    console.error("\u30B9\u30E9\u30A4\u30C9\u89E3\u6790\u30A8\u30E9\u30FC (".concat(slideIndex, "):"), error);
                                                    return Promise.resolve({
                                                        index: slideIndex,
                                                        imageUrl: '',
                                                        textElements: [],
                                                        shapes: [],
                                                        background: {
                                                            color: '#FFFFFF'
                                                        }
                                                    });
                                                }
                                            }
                                            return Promise.resolve({
                                                index: slideIndex,
                                                imageUrl: '',
                                                textElements: [],
                                                shapes: [],
                                                background: {
                                                    color: '#FFFFFF'
                                                }
                                            });
                                        });
                                        return [4 /*yield*/, Promise.all(batchPromises)];
                                    case 1:
                                        batchResults = _b.sent();
                                        // 結果を正しい位置に格納
                                        for (j = 0; j < batch.length; j++) {
                                            index = batch[j];
                                            result = batchResults[j];
                                            if (index !== undefined && index >= 0 && index < slideCount && result) {
                                                results[index] = result;
                                            }
                                            else if (index !== undefined && index >= 0 && index < slideCount) {
                                                // 空のスライドを作成
                                                results[index] = {
                                                    index: index,
                                                    imageUrl: '',
                                                    textElements: [],
                                                    shapes: [],
                                                    background: {
                                                        color: '#FFFFFF'
                                                    }
                                                };
                                            }
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < slideCount)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(i)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        i += this.batchSize;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * ファイルのハッシュを計算
     * @param filePath ファイルパス
     * @returns ハッシュ文字列
     */
    StreamingPPTXParser.prototype.calculateFileHash = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var fileContent, hash, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fsPromises.readFile(filePath)];
                    case 1:
                        fileContent = _a.sent();
                        hash = crypto.createHash('md5').update(fileContent).digest('hex');
                        return [2 /*return*/, hash];
                    case 2:
                        error_1 = _a.sent();
                        console.error("\u30D5\u30A1\u30A4\u30EB\u30CF\u30C3\u30B7\u30E5\u306E\u8A08\u7B97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(filePath), error_1);
                        return [2 /*return*/, ''];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 依存関係を確認
     */
    StreamingPPTXParser.prototype.checkDependencies = function () {
        return __awaiter(this, void 0, void 0, function () {
            var spawn, pythonProcess_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
                    case 1:
                        spawn = (_a.sent()).spawn;
                        pythonProcess_1 = spawn(this.pythonPath, ['--version']);
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                pythonProcess_1.on('error', function (error) {
                                    console.error('Pythonの実行に失敗しました:', error);
                                    reject(new Error("Python\u306E\u5B9F\u884C\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error.message)));
                                });
                                pythonProcess_1.on('close', function (code) {
                                    if (code === 0) {
                                        resolve();
                                    }
                                    else {
                                        reject(new Error("Python\u306E\u5B9F\u884C\u304C\u30B3\u30FC\u30C9 ".concat(code, " \u3067\u7D42\u4E86\u3057\u307E\u3057\u305F")));
                                    }
                                });
                            })];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Python依存関係の確認に失敗しました:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * キャッシュが有効かどうかを確認
     * @param cache キャッシュエントリ
     * @param fileHash ファイルハッシュ
     * @returns 有効な場合はtrue
     */
    StreamingPPTXParser.prototype.isCacheValid = function (cache, fileHash) {
        // キャッシュが存在しない場合は無効
        if (!cache) {
            return false;
        }
        // ファイルハッシュが異なる場合は無効
        if (cache.fileHash !== fileHash) {
            return false;
        }
        // キャッシュの有効期限を確認
        var now = Date.now();
        var age = now - cache.timestamp;
        return age <= this.cacheExpirationTime;
    };
    /**
     * PPTXファイルを解析し、結果を返す
     * @param inputPath 入力ファイルパス
     * @param options 解析オプション
     * @returns 解析結果
     * @throws {Error} ファイルが存在しない場合や解析に失敗した場合
     */
    StreamingPPTXParser.prototype.parsePPTX = function (inputPath_1) {
        return __awaiter(this, arguments, void 0, function (inputPath, options) {
            var cachedResult, error_3, structuredError;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.validateInputFile(inputPath)];
                    case 1:
                        _a.sent();
                        // 依存関係のチェック
                        return [4 /*yield*/, this.checkDependencies()];
                    case 2:
                        // 依存関係のチェック
                        _a.sent();
                        return [4 /*yield*/, this.tryGetFromCache(inputPath, options)];
                    case 3:
                        cachedResult = _a.sent();
                        if (cachedResult) {
                            return [2 /*return*/, cachedResult];
                        }
                        return [4 /*yield*/, this.parseAndCacheResult(inputPath, options)];
                    case 4: 
                    // キャッシュにない場合は解析を実行
                    return [2 /*return*/, _a.sent()];
                    case 5:
                        error_3 = _a.sent();
                        structuredError = this.logError('parsePPTX', error_3, inputPath, 'critical', false);
                        console.error('エラー情報:', structuredError);
                        // エラーを再スロー
                        if (error_3 instanceof Error) {
                            throw new Error("PPTX\u30D5\u30A1\u30A4\u30EB\u306E\u89E3\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error_3.message));
                        }
                        else {
                            throw new Error("PPTX\u30D5\u30A1\u30A4\u30EB\u306E\u89E3\u6790\u4E2D\u306B\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ".concat(String(error_3)));
                        }
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 入力ファイルの検証
     * @param inputPath 入力ファイルパス
     * @throws {Error} ファイルが存在しない場合やアクセスできない場合
     */
    StreamingPPTXParser.prototype.validateInputFile = function (inputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var error_4, stats, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // ファイルの存在確認
                        if (!fs.existsSync(inputPath)) {
                            throw new Error("\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ".concat(inputPath));
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fsPromises.access(inputPath, fs.constants.R_OK)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        throw new Error("\u30D5\u30A1\u30A4\u30EB\u306B\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u305B\u3093: ".concat(inputPath, " - ").concat(error_4 instanceof Error ? error_4.message : String(error_4)));
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, fsPromises.stat(inputPath)];
                    case 5:
                        stats = _a.sent();
                        if (stats.size === 0) {
                            throw new Error("\u30D5\u30A1\u30A4\u30EB\u304C\u7A7A\u3067\u3059: ".concat(inputPath));
                        }
                        // ファイルサイズのログ出力
                        console.log("\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA: ".concat((stats.size / 1024 / 1024).toFixed(2), " MB"));
                        return [3 /*break*/, 7];
                    case 6:
                        error_5 = _a.sent();
                        throw new Error("\u30D5\u30A1\u30A4\u30EB\u306E\u72B6\u614B\u78BA\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(inputPath, " - ").concat(error_5 instanceof Error ? error_5.message : String(error_5)));
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * エラー情報をログに記録する
     * @param method エラーが発生したメソッド名
     * @param error エラーオブジェクト
     * @param context エラーのコンテキスト情報（ファイルパスなど）
     * @param severity エラーの重大度
     * @param recovered 回復処理が行われたか
     * @returns 構造化されたエラー情報
     */
    StreamingPPTXParser.prototype.logError = function (method, error, context, severity, recovered) {
        if (severity === void 0) { severity = 'medium'; }
        if (recovered === void 0) { recovered = false; }
        // コンソールに出力
        console.error("Error in ".concat(method, ": ").concat(error instanceof Error ? error.message : String(error)));
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        if (context) {
            console.error("Context: ".concat(context));
        }
        // メモリ使用量を取得
        var memoryUsage = process.memoryUsage();
        // 構造化されたエラー情報を作成
        var structuredError = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            method: method,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context: context,
            systemInfo: {
                nodeVersion: process.version,
                memoryUsage: memoryUsage,
                platform: process.platform,
                arch: process.arch
            },
            recovered: recovered,
            severity: severity
        };
        // エラーログに追加
        this.errorLog.unshift(structuredError);
        if (this.errorLog.length > this.maxErrorLogSize) {
            this.errorLog.pop(); // 古いエラーを削除
        }
        // エラーカウントを更新
        var errorKey = "".concat(method, ":").concat(structuredError.message);
        this.errorCount[errorKey] = (this.errorCount[errorKey] || 0) + 1;
        return structuredError;
    };
    /**
     * キャッシュから結果を取得する
     * @param inputPath 入力ファイルパス
     * @param options パースオプション
     * @returns キャッシュされた結果（存在しない場合はnull）
     */
    StreamingPPTXParser.prototype.tryGetFromCache = function (inputPath, options) {
        return __awaiter(this, void 0, void 0, function () {
            var fileHash, cacheKey, cacheEntry, error_6, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (options.skipCache) {
                            return [2 /*return*/, null];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.calculateFileHash(inputPath)];
                    case 2:
                        fileHash = _a.sent();
                        cacheKey = inputPath;
                        cacheEntry = this.parserCache.get(cacheKey);
                        // キャッシュの有効性を確認
                        if (cacheEntry && this.isCacheValid(cacheEntry, fileHash)) {
                            console.log("\u30AD\u30E3\u30C3\u30B7\u30E5\u304B\u3089\u7D50\u679C\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F: ".concat(inputPath));
                            return [2 /*return*/, cacheEntry.result];
                        }
                        return [2 /*return*/, null];
                    case 3:
                        error_6 = _a.sent();
                        errorMessage = error_6 instanceof Error ? error_6.message : String(error_6);
                        console.error("\u30AD\u30E3\u30C3\u30B7\u30E5\u304B\u3089\u7D50\u679C\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F: ".concat(errorMessage));
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 結果をキャッシュに保存する
     * @param inputPath 入力ファイルパス
     * @param options パースオプション
     * @returns 解析結果
     */
    StreamingPPTXParser.prototype.parseAndCacheResult = function (inputPath, options) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, fileHash, hashTime, outputDir, fileSize, adjustedBatchSize, workingFilePath, copyTime, result, parseTime, cacheKey, endTime;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = perf_hooks_1.performance.now();
                        return [4 /*yield*/, this.calculateFileHash(inputPath)];
                    case 1:
                        fileHash = _a.sent();
                        hashTime = perf_hooks_1.performance.now();
                        console.log("\u30D5\u30A1\u30A4\u30EB\u30CF\u30C3\u30B7\u30E5\u8A08\u7B97\u6642\u9593: ".concat(hashTime - startTime, "ms"));
                        outputDir = path.join(this.cacheDir, path.basename(inputPath, '.pptx'));
                        return [4 /*yield*/, fsPromises.mkdir(outputDir, { recursive: true })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, fsPromises.stat(inputPath)];
                    case 3:
                        fileSize = (_a.sent()).size;
                        adjustedBatchSize = fileSize > 10 * 1024 * 1024 ? Math.min(this.batchSize, 5) : this.batchSize;
                        console.log("\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA: ".concat(fileSize, " \u30D0\u30A4\u30C8, \u30D0\u30C3\u30C1\u30B5\u30A4\u30BA: ").concat(adjustedBatchSize));
                        // ストリーミングI/Oを使用してファイルを処理
                        if (!this.streamingIO) {
                            this.streamingIO = new streaming_io_1.StreamingIO(this.bufferSize, 20);
                        }
                        workingFilePath = path.join(outputDir, path.basename(inputPath));
                        return [4 /*yield*/, this.streamCopyFile(inputPath, workingFilePath)];
                    case 4:
                        _a.sent();
                        copyTime = perf_hooks_1.performance.now();
                        console.log("\u30D5\u30A1\u30A4\u30EB\u30B3\u30D4\u30FC\u6642\u9593: ".concat(copyTime - hashTime, "ms"));
                        // ワーカープールを初期化
                        this.initializeWorkerPool();
                        return [4 /*yield*/, this.executePythonScript(inputPath, outputDir)];
                    case 5:
                        result = _a.sent();
                        parseTime = perf_hooks_1.performance.now();
                        console.log("\u89E3\u6790\u51E6\u7406\u6642\u9593: ".concat(parseTime - copyTime, "ms"));
                        // 結果をキャッシュに保存
                        if (!options.skipCache) {
                            cacheKey = inputPath;
                            this.parserCache.set(cacheKey, {
                                result: result,
                                timestamp: Date.now(),
                                fileHash: fileHash
                            });
                        }
                        endTime = perf_hooks_1.performance.now();
                        console.log("\u5168\u4F53\u51E6\u7406\u6642\u9593: ".concat(endTime - startTime, "ms"));
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * ファイルをストリーミングでコピー
     * @param sourcePath コピー元パス
     * @param destPath コピー先パス
     */
    StreamingPPTXParser.prototype.streamCopyFile = function (sourcePath, destPath) {
        return __awaiter(this, void 0, void 0, function () {
            var buffer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.streamingIO && this.bufferPool)) return [3 /*break*/, 5];
                        buffer = this.bufferPool.get();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, this.streamingIO.copyFileWithBuffer(sourcePath, destPath, buffer)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        // 使用後はバッファをプールに返却
                        this.bufferPool.release(buffer);
                        return [7 /*endfinally*/];
                    case 4: return [3 /*break*/, 9];
                    case 5:
                        if (!this.streamingIO) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.streamingIO.copyFile(sourcePath, destPath)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 7: 
                    // ストリーミングI/Oが無効な場合は通常のコピー
                    return [4 /*yield*/, fs.promises.copyFile(sourcePath, destPath)];
                    case 8:
                        // ストリーミングI/Oが無効な場合は通常のコピー
                        _a.sent();
                        _a.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Pythonスクリプトを実行する
     * @param inputPath 入力ファイルパス
     * @param outputDir 出力ディレクトリ
     * @returns Pythonスクリプトの実行結果
     */
    StreamingPPTXParser.prototype.executePythonScript = function (inputPath, outputDir) {
        return __awaiter(this, void 0, void 0, function () {
            var slideCountResult, slideCount, metadata, slides, parseResult, error_7, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        // ワーカープールが初期化されているか確認
                        if (!this.workerPool) {
                            this.initializeWorkerPool();
                        }
                        // ストリーミングI/Oが初期化されているか確認
                        if (!this.streamingIO) {
                            this.streamingIO = new streaming_io_1.StreamingIO(this.bufferSize, 20);
                        }
                        return [4 /*yield*/, this.getSlideCount(inputPath)];
                    case 1:
                        slideCountResult = _a.sent();
                        slideCount = slideCountResult.count;
                        console.log("\u30B9\u30E9\u30A4\u30C9\u6570: ".concat(slideCount));
                        // スライド数が0の場合は空の結果を返す
                        if (slideCount === 0) {
                            return [2 /*return*/, {
                                    slides: [],
                                    filename: path.basename(inputPath),
                                    totalSlides: 0,
                                    metadata: {
                                        title: path.basename(inputPath),
                                        author: 'Unknown',
                                        created: new Date().toISOString(),
                                        modified: new Date().toISOString(),
                                        lastModifiedBy: 'System',
                                        revision: 1,
                                        presentationFormat: 'Unknown'
                                    }
                                }];
                        }
                        return [4 /*yield*/, this.getMetadata(inputPath)];
                    case 2:
                        metadata = _a.sent();
                        return [4 /*yield*/, this.parseSlidesConcurrently(inputPath, outputDir, slideCount)];
                    case 3:
                        slides = _a.sent();
                        parseResult = {
                            slides: slides,
                            filename: path.basename(inputPath),
                            totalSlides: slides.length,
                            metadata: {
                                title: metadata.title || path.basename(inputPath),
                                author: metadata.author || 'Unknown',
                                created: metadata.created || new Date().toISOString(),
                                modified: metadata.modified || new Date().toISOString(),
                                lastModifiedBy: metadata.lastModifiedBy || 'System',
                                revision: metadata.revision || 1,
                                presentationFormat: metadata.presentationFormat || 'Unknown'
                            }
                        };
                        return [2 /*return*/, parseResult];
                    case 4:
                        error_7 = _a.sent();
                        errorMessage = error_7 instanceof Error ? error_7.message : String(error_7);
                        console.error('Error executing Python script:', errorMessage);
                        // エラーを構造化して記録
                        this.logError('executePythonScript', error_7, inputPath);
                        // エラーメッセージを詳細化
                        if (error_7 instanceof Error) {
                            throw new Error("PPTX\u30D1\u30FC\u30B9\u51E6\u7406\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ".concat(errorMessage));
                        }
                        else {
                            throw new Error("PPTX\u30D1\u30FC\u30B9\u51E6\u7406\u3067\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ".concat(String(error_7)));
                        }
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * エラー情報を分析する
     * @returns エラー分析結果
     */
    StreamingPPTXParser.prototype.analyzeErrors = function () {
        var totalErrors = this.errorLog.length;
        var recoveredErrors = 0;
        var errorsBySeverity = {};
        var errorsByMethod = {};
        var errorMessages = {};
        // エラーログを分析
        for (var _i = 0, _a = this.errorLog; _i < _a.length; _i++) {
            var error = _a[_i];
            // 回復されたエラーをカウント
            if (error.recovered) {
                recoveredErrors++;
            }
            // 重大度別のエラー数をカウント
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
            // メソッド別のエラー数をカウント
            errorsByMethod[error.method] = (errorsByMethod[error.method] || 0) + 1;
            // エラーメッセージ別のカウント
            errorMessages[error.message] = (errorMessages[error.message] || 0) + 1;
        }
        // 最も频度の高いエラーを抽出
        var mostFrequentErrors = Object.entries(errorMessages)
            .map(function (_a) {
            var message = _a[0], count = _a[1];
            return ({ message: message, count: count });
        })
            .sort(function (a, b) { return b.count - a.count; })
            .slice(0, 5);
        return {
            totalErrors: totalErrors,
            recoveredErrors: recoveredErrors,
            errorsBySeverity: errorsBySeverity,
            errorsByMethod: errorsByMethod,
            mostFrequentErrors: mostFrequentErrors,
            lastError: this.errorLog.length > 0 ? this.errorLog[0] : undefined
        };
    };
    /**
     * エラーログをクリアする
     */
    StreamingPPTXParser.prototype.clearErrorLog = function () {
        this.errorLog = [];
        this.errorCount = {};
    };
    /**
     * エラーログを取得する
     * @param limit 取得するエラーの最大数
     * @returns エラーログ
     */
    StreamingPPTXParser.prototype.getErrorLog = function (limit) {
        if (limit && limit > 0) {
            return this.errorLog.slice(0, limit);
        }
        return __spreadArray([], this.errorLog, true);
    };
    /**
     * 解析結果からテキストを抽出
     * @param parseResult 解析結果
     * @returns テキストの配列
     */
    StreamingPPTXParser.prototype.extractTexts = function (parseResult) {
        if (!parseResult || !parseResult.slides || !Array.isArray(parseResult.slides)) {
            console.warn('無効な解析結果からテキストを抽出しようとしました');
            return [];
        }
        return parseResult.slides.flatMap(function (slide) {
            // テキスト要素が存在しない場合は空配列を返す
            var textElements = slide.textElements || [];
            // 空のテキストを除外し、改行や空白を正規化
            return textElements
                .map(function (element) {
                var text = element.text || '';
                // 空白や特殊文字を正規化
                return text.trim()
                    .replace(/\s+/g, ' ') // 複数の空白を単一の空白に
                    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // ゼロ幅スペースや特殊文字を除去
            })
                .filter(function (text) { return text.length > 0; }); // 空の文字列を除外
        });
    };
    /**
     * フォールバック処理を含むPPTXファイルの解析
     * 通常の解析が失敗した場合に代替手段を試みる
     * @param inputPath 入力ファイルパス
     * @param options 解析オプション
     * @returns 解析結果（部分的な結果を含む場合もある）
     */
    StreamingPPTXParser.prototype.parseWithFallback = function (inputPath_1) {
        return __awaiter(this, arguments, void 0, function (inputPath, options) {
            var error_8, structuredError, fallbackError_1;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 7]);
                        return [4 /*yield*/, this.parsePPTX(inputPath, options)];
                    case 1: 
                    // 通常の解析を試みる
                    return [2 /*return*/, _a.sent()];
                    case 2:
                        error_8 = _a.sent();
                        structuredError = this.logError('parseWithFallback', error_8, inputPath, 'medium', true);
                        console.warn("\u901A\u5E38\u306E\u89E3\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AF\u51E6\u7406\u3092\u8A66\u307F\u307E\u3059: ".concat(structuredError.message));
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.createPartialResults(inputPath, error_8)];
                    case 4: 
                    // 部分的な結果を作成
                    return [2 /*return*/, _a.sent()];
                    case 5:
                        fallbackError_1 = _a.sent();
                        // フォールバックも失敗した場合
                        this.logError('parseWithFallback', fallbackError_1, inputPath, 'high', false);
                        // 最小限の結果を返す
                        return [2 /*return*/, {
                                slides: [],
                                filename: path.basename(inputPath),
                                totalSlides: 0,
                                metadata: {
                                    title: path.basename(inputPath),
                                    author: 'Unknown',
                                    created: new Date().toISOString(),
                                    modified: new Date().toISOString(),
                                    lastModifiedBy: 'System',
                                    revision: 1,
                                    presentationFormat: 'Unknown'
                                },
                                error: {
                                    message: fallbackError_1 instanceof Error ? fallbackError_1.message : String(fallbackError_1),
                                    recoveryAttempted: true,
                                    recoverySuccessful: false
                                }
                            }];
                    case 6: return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 解析に失敗した場合に部分的な結果を作成する
     * @param inputPath 入力ファイルパス
     * @param originalError 元のエラー
     * @returns 部分的な解析結果
     */
    StreamingPPTXParser.prototype.createPartialResults = function (inputPath, originalError) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, stats, fileInfo, metadata, slides, endTime, error_9, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\u90E8\u5206\u7684\u306A\u7D50\u679C\u3092\u4F5C\u6210\u3057\u3066\u3044\u307E\u3059: ".concat(inputPath));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        startTime = perf_hooks_1.performance.now();
                        return [4 /*yield*/, fsPromises.stat(inputPath)];
                    case 2:
                        stats = _a.sent();
                        fileInfo = path.parse(inputPath);
                        metadata = {
                            title: fileInfo.name,
                            author: 'Unknown',
                            created: stats.birthtime.toISOString(),
                            modified: stats.mtime.toISOString(),
                            lastModifiedBy: 'System',
                            revision: 1,
                            presentationFormat: 'Unknown'
                        };
                        slides = [{
                                index: 0,
                                imageUrl: '',
                                textElements: [],
                                shapes: [],
                                background: { color: '#FFFFFF' }
                            }];
                        endTime = perf_hooks_1.performance.now();
                        console.log("\u90E8\u5206\u7684\u306A\u7D50\u679C\u306E\u4F5C\u6210\u6642\u9593: ".concat(endTime - startTime, "ms"));
                        // 部分的な結果を返す
                        return [2 /*return*/, {
                                filename: path.basename(inputPath),
                                totalSlides: 1,
                                metadata: metadata,
                                slides: slides,
                                error: {
                                    message: originalError instanceof Error ? originalError.message : String(originalError),
                                    recoveryAttempted: true,
                                    recoverySuccessful: true,
                                    details: '部分的な結果のみ利用可能です。完全な解析は失敗しました。',
                                    timestamp: Date.now()
                                }
                            }];
                    case 3:
                        error_9 = _a.sent();
                        errorMessage = error_9 instanceof Error ? error_9.message : String(error_9);
                        console.error("\u90E8\u5206\u7684\u306A\u7D50\u679C\u306E\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(errorMessage));
                        // エラーを記録
                        this.logError('createPartialResults', error_9, inputPath, 'high', false);
                        // 最小限の結果を返す
                        throw new Error("\u90E8\u5206\u7684\u306A\u7D50\u679C\u306E\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(errorMessage));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * スライド数を取得する
     * @param inputPath 入力ファイルパス
     * @returns スライド数とエラー情報
     */
    StreamingPPTXParser.prototype.getSlideCount = function (inputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime_1, options_1, errorMessage;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    startTime_1 = perf_hooks_1.performance.now();
                    options_1 = {
                        mode: 'json',
                        pythonPath: this.pythonPath,
                        pythonOptions: ['-u'],
                        scriptPath: path.dirname(this.scriptPath),
                        args: [
                            '--input', inputPath,
                            '--count-only', 'true'
                        ]
                    };
                    return [2 /*return*/, new Promise(function (resolve) {
                            try {
                                // @ts-ignore - PythonShellの型定義の問題を回避
                                python_shell_1.PythonShell.run(path.basename(_this.scriptPath), options_1, function (err, results) {
                                    if (err) {
                                        console.error('スライド数取得に失敗しました:', err);
                                        resolve({ count: 0, error: err.message });
                                        return;
                                    }
                                    if (!results || results.length === 0) {
                                        resolve({ count: 0, error: 'Pythonスクリプトから結果が返されませんでした' });
                                        return;
                                    }
                                    var result = results[results.length - 1];
                                    resolve({ count: result.slideCount || 0 });
                                    // パフォーマンス計測終了
                                    var endTime = perf_hooks_1.performance.now();
                                    console.log("\u30B9\u30E9\u30A4\u30C9\u6570\u53D6\u5F97\u6642\u9593: ".concat(endTime - startTime_1, "ms"));
                                });
                            }
                            catch (error) {
                                var errorMessage = error instanceof Error ? error.message : String(error);
                                console.error('スライド数取得の初期化に失敗しました:', errorMessage);
                                resolve({ count: 0, error: errorMessage });
                            }
                        })];
                }
                catch (error) {
                    errorMessage = error instanceof Error ? error.message : String(error);
                    return [2 /*return*/, { count: 0, error: errorMessage }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * メタデータを取得する
     * @param inputPath 入力ファイルパス
     * @returns メタデータ
     */
    StreamingPPTXParser.prototype.getMetadata = function (inputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var options_2;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    options_2 = {
                        mode: 'json',
                        pythonPath: this.pythonPath,
                        pythonOptions: ['-u'],
                        scriptPath: path.dirname(this.scriptPath),
                        args: [
                            '--input', inputPath,
                            '--metadata-only', 'true'
                        ]
                    };
                    return [2 /*return*/, new Promise(function (resolve) {
                            try {
                                // @ts-ignore - PythonShellの型定義の問題を回避
                                python_shell_1.PythonShell.run(path.basename(_this.scriptPath), options_2, function (err, results) {
                                    if (err) {
                                        console.error('メタデータ取得に失敗しました:', err);
                                        resolve({
                                            title: path.basename(inputPath),
                                            author: 'Unknown',
                                            created: new Date().toISOString(),
                                            modified: new Date().toISOString(),
                                            lastModifiedBy: 'System',
                                            revision: 1,
                                            presentationFormat: 'Unknown'
                                        });
                                        return;
                                    }
                                    if (!results || results.length === 0) {
                                        resolve({
                                            title: path.basename(inputPath),
                                            author: 'Unknown',
                                            created: new Date().toISOString(),
                                            modified: new Date().toISOString(),
                                            lastModifiedBy: 'System',
                                            revision: 1,
                                            presentationFormat: 'Unknown'
                                        });
                                        return;
                                    }
                                    var result = results[results.length - 1];
                                    resolve(result.metadata || {
                                        title: path.basename(inputPath),
                                        author: 'Unknown',
                                        created: new Date().toISOString(),
                                        modified: new Date().toISOString(),
                                        lastModifiedBy: 'System',
                                        revision: 1,
                                        presentationFormat: 'Unknown'
                                    });
                                });
                            }
                            catch (error) {
                                var errorMessage = error instanceof Error ? error.message : String(error);
                                console.error('メタデータ取得の初期化に失敗しました:', errorMessage);
                                resolve({
                                    title: path.basename(inputPath),
                                    author: 'Unknown',
                                    created: new Date().toISOString(),
                                    modified: new Date().toISOString(),
                                    lastModifiedBy: 'System',
                                    revision: 1,
                                    presentationFormat: 'Unknown'
                                });
                            }
                        })];
                }
                catch (error) {
                    return [2 /*return*/, {
                            title: path.basename(inputPath),
                            author: 'Unknown',
                            created: new Date().toISOString(),
                            modified: new Date().toISOString(),
                            lastModifiedBy: 'System',
                            revision: 1,
                            presentationFormat: 'Unknown'
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 解析結果から位置情報付きテキストを取得
     * @param parseResult 解析結果
     * @returns スライド内容の配列
     */
    StreamingPPTXParser.prototype.getTextWithPositions = function (parseResult) {
        if (!parseResult || !parseResult.slides || !Array.isArray(parseResult.slides)) {
            console.warn('無効な解析結果から位置情報付きテキストを取得しようとしました');
            return [];
        }
        // 各スライドのテキスト要素を正規化
        return parseResult.slides.map(function (slide) {
            // テキスト要素が存在しない場合は空配列を使用
            var textElements = slide.textElements || [];
            // テキスト要素の正規化
            var normalizedTextElements = textElements.map(function (element) {
                // ディープコピーを作成して元のオブジェクトを変更しない
                var normalizedElement = __assign({}, element);
                if (normalizedElement.text) {
                    // 空白や特殊文字を正規化
                    normalizedElement.text = normalizedElement.text.trim()
                        .replace(/\s+/g, ' ') // 複数の空白を単一の空白に
                        .replace(/[\u200B-\u200D\uFEFF]/g, ''); // ゼロ幅スペースや特殊文字を除去
                }
                return normalizedElement;
            }).filter(function (element) { return element.text && element.text.length > 0; }); // 空のテキスト要素を除外
            // 新しいスライドオブジェクトを作成して返す
            return __assign(__assign({}, slide), { textElements: normalizedTextElements });
        });
    };
    return StreamingPPTXParser;
}());
exports.StreamingPPTXParser = StreamingPPTXParser;
