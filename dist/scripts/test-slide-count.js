"use strict";
/**
 * StreamingPPTXParserのgetSlideCountとgetMetadataメソッドのパフォーマンステスト
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
var streaming_parser_1 = require("../lib/pptx/streaming-parser");
var path_1 = require("path");
var fs_1 = require("fs");
var perf_hooks_1 = require("perf_hooks");
// メモリ使用量を取得する関数
function getMemoryUsage() {
    var memoryUsage = process.memoryUsage();
    return {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
    };
}
// テスト関数
function testMethods(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var parser, fileSize, filename, memoryBefore, startSlideCount, slideCountResult, slideCountTime, startMetadata, metadata, metadataTime, memoryAfter;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    parser = new streaming_parser_1.StreamingPPTXParser();
                    fileSize = fs_1.default.statSync(filePath).size;
                    filename = path_1.default.basename(filePath);
                    console.log("\n===== \u30C6\u30B9\u30C8: ".concat(filename, " (").concat(Math.round(fileSize / 1024), " KB) ====="));
                    memoryBefore = getMemoryUsage();
                    console.log("\u30E1\u30E2\u30EA\u4F7F\u7528\u91CF\uFF08\u521D\u671F\uFF09: ".concat(memoryBefore.heapUsed, " MB"));
                    // getSlideCountのパフォーマンス測定
                    console.time('getSlideCount');
                    startSlideCount = perf_hooks_1.performance.now();
                    return [4 /*yield*/, parser.getSlideCount(filePath)];
                case 1:
                    slideCountResult = _a.sent();
                    slideCountTime = perf_hooks_1.performance.now() - startSlideCount;
                    console.timeEnd('getSlideCount');
                    console.log("\u30B9\u30E9\u30A4\u30C9\u6570\u53D6\u5F97\u7D50\u679C: ".concat(slideCountResult.count, " \u30B9\u30E9\u30A4\u30C9"));
                    // getMetadataのパフォーマンス測定
                    console.time('getMetadata');
                    startMetadata = perf_hooks_1.performance.now();
                    return [4 /*yield*/, parser.getMetadata(filePath)];
                case 2:
                    metadata = _a.sent();
                    metadataTime = perf_hooks_1.performance.now() - startMetadata;
                    console.timeEnd('getMetadata');
                    console.log('メタデータ取得結果:', metadata);
                    memoryAfter = getMemoryUsage();
                    console.log("\u30E1\u30E2\u30EA\u4F7F\u7528\u91CF\uFF08\u30C6\u30B9\u30C8\u5F8C\uFF09: ".concat(memoryAfter.heapUsed, " MB (").concat(memoryAfter.heapUsed - memoryBefore.heapUsed, " MB\u5897\u52A0)"));
                    return [2 /*return*/, {
                            filename: filename,
                            fileSize: fileSize,
                            slideCountTime: slideCountTime,
                            metadataTime: metadataTime,
                            slideCount: slideCountResult.count,
                            metadata: metadata,
                            memoryBefore: memoryBefore,
                            memoryAfter: memoryAfter
                        }];
            }
        });
    });
}
// メイン関数
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var testFilesDir_1, files, results, _i, files_1, file, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    testFilesDir_1 = path_1.default.join(__dirname, '..', 'tests', 'fixtures', 'pptx');
                    // テストファイルのディレクトリが存在しない場合は作成
                    if (!fs_1.default.existsSync(testFilesDir_1)) {
                        fs_1.default.mkdirSync(testFilesDir_1, { recursive: true });
                        console.log("\u30C6\u30B9\u30C8\u30D5\u30A1\u30A4\u30EB\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ".concat(testFilesDir_1));
                        console.log('テストファイルを配置してください。');
                        return [2 /*return*/];
                    }
                    files = fs_1.default.readdirSync(testFilesDir_1)
                        .filter(function (file) { return file.endsWith('.pptx'); })
                        .map(function (file) { return path_1.default.join(testFilesDir_1, file); });
                    if (files.length === 0) {
                        console.log("\u30C6\u30B9\u30C8\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002".concat(testFilesDir_1, " \u306BPPTX\u30D5\u30A1\u30A4\u30EB\u3092\u914D\u7F6E\u3057\u3066\u304F\u3060\u3055\u3044\u3002"));
                        return [2 /*return*/];
                    }
                    console.log("".concat(files.length, "\u500B\u306E\u30C6\u30B9\u30C8\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F\u3002"));
                    results = [];
                    _i = 0, files_1 = files;
                    _a.label = 1;
                case 1:
                    if (!(_i < files_1.length)) return [3 /*break*/, 4];
                    file = files_1[_i];
                    return [4 /*yield*/, testMethods(file)];
                case 2:
                    result = _a.sent();
                    results.push(result);
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    // 結果のサマリーを表示
                    console.log('\n===== テスト結果サマリー =====');
                    console.table(results.map(function (r) { return ({
                        ファイル名: r.filename,
                        サイズ: "".concat(Math.round(r.fileSize / 1024), " KB"),
                        スライド数: r.slideCount,
                        スライド数取得時間: "".concat(r.slideCountTime.toFixed(2), " ms"),
                        メタデータ取得時間: "".concat(r.metadataTime.toFixed(2), " ms"),
                        メモリ増加: "".concat((r.memoryAfter.heapUsed - r.memoryBefore.heapUsed).toFixed(2), " MB"),
                    }); }));
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('テスト実行中にエラーが発生しました:', error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// スクリプト実行
main().catch(console.error);
