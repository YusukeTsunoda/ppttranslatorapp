"use strict";
/**
 * ストリーミングI/Oユーティリティ
 * 大きなファイルを効率的に処理するためのストリーム処理機能を提供します
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
exports.StreamingIO = exports.BufferPool = void 0;
exports.streamToBuffer = streamToBuffer;
exports.bufferToStream = bufferToStream;
exports.processFileStream = processFileStream;
var fs = require("fs");
var stream_1 = require("stream");
var util_1 = require("util");
var fs_1 = require("fs");
var zlib = require("zlib");
// pipelineをPromise化
var pipelineAsync = (0, util_1.promisify)(stream_1.pipeline);
/**
 * バッファプールクラス
 * メモリ効率を向上させるためにバッファを再利用します
 */
var BufferPool = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param size バッファサイズ（バイト）
     * @param maxPoolSize プール内の最大バッファ数
     */
    function BufferPool(size, maxPoolSize) {
        if (size === void 0) { size = 64 * 1024; }
        if (maxPoolSize === void 0) { maxPoolSize = 10; }
        this.pool = [];
        this.size = size;
        this.maxPoolSize = maxPoolSize;
    }
    /**
     * バッファを取得
     * @returns バッファ
     */
    BufferPool.prototype.get = function () {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return Buffer.allocUnsafe(this.size);
    };
    /**
     * バッファを返却
     * @param buffer 返却するバッファ
     */
    BufferPool.prototype.release = function (buffer) {
        if (buffer.length !== this.size) {
            return; // サイズが異なる場合は再利用しない
        }
        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(buffer);
        }
    };
    /**
     * プールをクリア
     */
    BufferPool.prototype.clear = function () {
        this.pool = [];
    };
    /**
     * プールサイズを取得
     */
    BufferPool.prototype.getPoolSize = function () {
        return this.pool.length;
    };
    return BufferPool;
}());
exports.BufferPool = BufferPool;
/**
 * ストリーミングI/Oユーティリティクラス
 */
var StreamingIO = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param bufferSize バッファサイズ（バイト）
     * @param maxPoolSize プール内の最大バッファ数
     */
    function StreamingIO(bufferSize, maxPoolSize) {
        if (bufferSize === void 0) { bufferSize = 64 * 1024; }
        if (maxPoolSize === void 0) { maxPoolSize = 10; }
        this.bufferPool = new BufferPool(bufferSize, maxPoolSize);
    }
    /**
     * ファイルをチャンク単位で読み込む
     * @param filePath ファイルパス
     * @param chunkSize チャンクサイズ（バイト）
     * @param callback チャンク処理コールバック
     */
    StreamingIO.prototype.readFileInChunks = function (filePath, chunkSize, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var readStream = (0, fs_1.createReadStream)(filePath, {
                            highWaterMark: chunkSize
                        });
                        var chunkIndex = 0;
                        readStream.on('data', function (chunk) { return __awaiter(_this, void 0, void 0, function () {
                            var error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 5, , 6]);
                                        readStream.pause();
                                        if (!Buffer.isBuffer(chunk)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, callback(chunk, chunkIndex++)];
                                    case 1:
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 2: return [4 /*yield*/, callback(Buffer.from(chunk), chunkIndex++)];
                                    case 3:
                                        _a.sent();
                                        _a.label = 4;
                                    case 4:
                                        readStream.resume();
                                        return [3 /*break*/, 6];
                                    case 5:
                                        error_1 = _a.sent();
                                        readStream.destroy();
                                        reject(error_1);
                                        return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); });
                        readStream.on('end', function () {
                            resolve();
                        });
                        readStream.on('error', function (error) {
                            reject(error);
                        });
                    })];
            });
        });
    };
    /**
     * ストリームを使用してファイルをコピー
     * @param sourcePath ソースファイルパス
     * @param destPath 宛先ファイルパス
     * @param progressCallback 進捗コールバック
     */
    StreamingIO.prototype.copyFile = function (sourcePath, destPath, progressCallback) {
        return __awaiter(this, void 0, void 0, function () {
            var totalBytes, bytesRead, readStream, writeStream, progressStream;
            return __generator(this, function (_a) {
                totalBytes = fs.statSync(sourcePath).size;
                bytesRead = 0;
                readStream = (0, fs_1.createReadStream)(sourcePath);
                writeStream = (0, fs_1.createWriteStream)(destPath);
                progressStream = new stream_1.Transform({
                    transform: function (chunk, _encoding, callback) {
                        bytesRead += chunk.length;
                        if (progressCallback) {
                            progressCallback(bytesRead, totalBytes);
                        }
                        callback(null, chunk);
                    }
                });
                return [2 /*return*/, pipelineAsync(readStream, progressStream, writeStream)];
            });
        });
    };
    /**
     * 外部から提供されたバッファを使用してファイルをコピー
     * @param sourcePath ソースファイルパス
     * @param destPath 宛先ファイルパス
     * @param buffer 使用するバッファ
     * @param progressCallback 進捗コールバック
     */
    StreamingIO.prototype.copyFileWithBuffer = function (sourcePath, destPath, buffer, progressCallback) {
        return __awaiter(this, void 0, void 0, function () {
            var totalBytes, bytesRead;
            return __generator(this, function (_a) {
                totalBytes = fs.statSync(sourcePath).size;
                bytesRead = 0;
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var readStream = fs.createReadStream(sourcePath, { highWaterMark: buffer.length });
                        var writeStream = fs.createWriteStream(destPath);
                        readStream.on('data', function (chunk) {
                            // チャンクがBuffer型か確認し、必要に応じて変換
                            var bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                            // チャンクを外部バッファにコピー
                            var length = Math.min(bufferChunk.length, buffer.length);
                            bufferChunk.copy(buffer, 0, 0, length);
                            // バッファから書き込み
                            writeStream.write(buffer.subarray(0, length));
                            bytesRead += length;
                            if (progressCallback) {
                                progressCallback(bytesRead, totalBytes);
                            }
                        });
                        readStream.on('end', function () {
                            writeStream.end();
                            resolve();
                        });
                        readStream.on('error', function (err) {
                            writeStream.end();
                            reject(err);
                        });
                        writeStream.on('error', function (err) {
                            readStream.destroy();
                            reject(err);
                        });
                    })];
            });
        });
    };
    /**
     * ファイルを圧縮
     * @param sourcePath ソースファイルパス
     * @param destPath 宛先ファイルパス（.gz拡張子が自動的に追加されます）
     */
    StreamingIO.prototype.compressFile = function (sourcePath, destPath) {
        return __awaiter(this, void 0, void 0, function () {
            var gzip, source, destination;
            return __generator(this, function (_a) {
                gzip = zlib.createGzip();
                source = (0, fs_1.createReadStream)(sourcePath);
                destination = (0, fs_1.createWriteStream)("".concat(destPath, ".gz"));
                return [2 /*return*/, pipelineAsync(source, gzip, destination)];
            });
        });
    };
    /**
     * 圧縮ファイルを解凍
     * @param sourcePath ソースファイルパス（.gz拡張子付き）
     * @param destPath 宛先ファイルパス
     */
    StreamingIO.prototype.decompressFile = function (sourcePath, destPath) {
        return __awaiter(this, void 0, void 0, function () {
            var gunzip, source, destination;
            return __generator(this, function (_a) {
                gunzip = zlib.createGunzip();
                source = (0, fs_1.createReadStream)(sourcePath);
                destination = (0, fs_1.createWriteStream)(destPath);
                return [2 /*return*/, pipelineAsync(source, gunzip, destination)];
            });
        });
    };
    /**
     * バッファプールを取得
     */
    StreamingIO.prototype.getBufferPool = function () {
        return this.bufferPool;
    };
    /**
     * リソースを解放
     */
    StreamingIO.prototype.dispose = function () {
        this.bufferPool.clear();
    };
    /**
     * バッファプールを使用してデータを変換する
     * @param inputStream 入力ストリーム
     * @param transformFn 変換関数
     * @returns 出力ストリーム
     */
    StreamingIO.prototype.createTransformStream = function (transformFn) {
        // バッファプールを作成し、メモリ効率を向上
        var bufferPool = new BufferPool();
        return new stream_1.Transform({
            transform: function (chunk, _encoding, callback) {
                try {
                    // バッファプールからバッファを取得
                    var buffer = bufferPool.get();
                    // 入力チャンクを変換
                    var transformedChunk = transformFn(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                    callback(null, transformedChunk);
                    // バッファをプールに返却
                    bufferPool.release(buffer);
                }
                catch (error) {
                    callback(error instanceof Error ? error : new Error(String(error)));
                }
            }
        });
    };
    return StreamingIO;
}());
exports.StreamingIO = StreamingIO;
/**
 * ストリームからデータを読み込み、バッファに格納
 * @param stream 読み込むストリーム
 * @returns バッファ
 */
function streamToBuffer(stream) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var chunks = [];
                    stream.on('data', function (chunk) {
                        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
                    });
                    stream.on('end', function () {
                        resolve(Buffer.concat(chunks));
                    });
                    stream.on('error', reject);
                })];
        });
    });
}
/**
 * バッファをストリームに変換
 * @param buffer バッファ
 * @returns 読み込みストリーム
 */
function bufferToStream(buffer) {
    var stream = new stream_1.Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}
/**
 * ファイルをストリームで読み込み、指定された関数で処理
 * @param filePath ファイルパス
 * @param processor 処理関数
 */
function processFileStream(filePath, processor) {
    return __awaiter(this, void 0, void 0, function () {
        var stream;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stream = (0, fs_1.createReadStream)(filePath);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, processor(stream)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    stream.destroy();
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
