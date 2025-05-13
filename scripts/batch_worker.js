"use strict";
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
var client_1 = require("@prisma/client");
var child_process_1 = require("child_process");
var path_1 = require("path");
var prisma = new client_1.PrismaClient();
function processBatchJobs() {
    return __awaiter(this, void 0, void 0, function () {
        var jobs, _loop_1, _i, jobs_1, job;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!true) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma.batchJob.findMany({ where: { status: 'PENDING' } })];
                case 1:
                    jobs = _a.sent();
                    _loop_1 = function (job) {
                        var files, progress, error_1, _loop_2, i, state_1, e_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 7, , 9]);
                                    // ジョブをPROCESSINGに
                                    return [4 /*yield*/, prisma.batchJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } })];
                                case 1:
                                    // ジョブをPROCESSINGに
                                    _b.sent();
                                    files = Array.isArray(job.files) ? job.files : [];
                                    progress = 0;
                                    error_1 = null;
                                    _loop_2 = function (i) {
                                        var file, pythonPath, texts, sourceLang, targetLang, model, args_1, e_2;
                                        return __generator(this, function (_c) {
                                            switch (_c.label) {
                                                case 0:
                                                    file = files[i];
                                                    if (!file)
                                                        return [2 /*return*/, "continue"]; // null/undefinedはスキップ
                                                    _c.label = 1;
                                                case 1:
                                                    _c.trys.push([1, 4, , 5]);
                                                    pythonPath = path_1.default.resolve('python_backend/translate.py');
                                                    texts = JSON.stringify(file.texts || []);
                                                    sourceLang = file.sourceLang || 'ja';
                                                    targetLang = file.targetLang || 'en';
                                                    model = file.model || 'claude-3-haiku-20240307';
                                                    args_1 = [
                                                        pythonPath,
                                                        '--texts', texts,
                                                        '--source-lang', sourceLang,
                                                        '--target-lang', targetLang,
                                                        '--model', model,
                                                    ];
                                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                                            var proc = (0, child_process_1.spawn)('python3', args_1);
                                                            var stdout = '';
                                                            var stderr = '';
                                                            proc.stdout.on('data', function (data) { stdout += data.toString(); });
                                                            proc.stderr.on('data', function (data) { stderr += data.toString(); });
                                                            proc.on('close', function (code) {
                                                                if (code === 0) {
                                                                    // 結果をファイルやDBに保存する場合はここで
                                                                    // file.translations = ...
                                                                    resolve();
                                                                }
                                                                else {
                                                                    error_1 = stderr || "Python exited with code ".concat(code);
                                                                    reject(new Error(error_1));
                                                                }
                                                            });
                                                        })];
                                                case 2:
                                                    _c.sent();
                                                    progress++;
                                                    // 進捗をDBに反映
                                                    return [4 /*yield*/, prisma.batchJob.update({ where: { id: job.id }, data: { progress: progress } })];
                                                case 3:
                                                    // 進捗をDBに反映
                                                    _c.sent();
                                                    return [3 /*break*/, 5];
                                                case 4:
                                                    e_2 = _c.sent();
                                                    error_1 = (e_2 instanceof Error) ? e_2.message : String(e_2);
                                                    return [2 /*return*/, "break"];
                                                case 5: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    i = 0;
                                    _b.label = 2;
                                case 2:
                                    if (!(i < files.length)) return [3 /*break*/, 5];
                                    return [5 /*yield**/, _loop_2(i)];
                                case 3:
                                    state_1 = _b.sent();
                                    if (state_1 === "break")
                                        return [3 /*break*/, 5];
                                    _b.label = 4;
                                case 4:
                                    i++;
                                    return [3 /*break*/, 2];
                                case 5: 
                                // 完了/失敗ステータス
                                return [4 /*yield*/, prisma.batchJob.update({
                                        where: { id: job.id },
                                        data: {
                                            status: error_1 ? 'FAILED' : 'COMPLETED',
                                            error: error_1,
                                            progress: progress,
                                            updatedAt: new Date(),
                                        },
                                    })];
                                case 6:
                                    // 完了/失敗ステータス
                                    _b.sent();
                                    return [3 /*break*/, 9];
                                case 7:
                                    e_1 = _b.sent();
                                    // ジョブ単位の致命的エラー
                                    return [4 /*yield*/, prisma.batchJob.update({
                                            where: { id: job.id },
                                            data: {
                                                status: 'FAILED',
                                                error: (e_1 instanceof Error) ? e_1.message : String(e_1),
                                                updatedAt: new Date(),
                                            },
                                        })];
                                case 8:
                                    // ジョブ単位の致命的エラー
                                    _b.sent();
                                    return [3 /*break*/, 9];
                                case 9: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, jobs_1 = jobs;
                    _a.label = 2;
                case 2:
                    if (!(_i < jobs_1.length)) return [3 /*break*/, 5];
                    job = jobs_1[_i];
                    return [5 /*yield**/, _loop_1(job)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: 
                // 5秒ごとにポーリング
                return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 5000); })];
                case 6:
                    // 5秒ごとにポーリング
                    _a.sent();
                    return [3 /*break*/, 0];
                case 7: return [2 /*return*/];
            }
        });
    });
}
processBatchJobs().catch(function (e) {
    console.error('バッチワーカー致命的エラー:', e);
    process.exit(1);
});
