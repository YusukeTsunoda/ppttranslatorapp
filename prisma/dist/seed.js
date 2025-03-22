'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
var client_1 = require('@prisma/client');
var uuid_1 = require('uuid');
var bcrypt_1 = require('bcrypt');
var prisma = new client_1.PrismaClient();
function main() {
  return __awaiter(this, void 0, void 0, function () {
    var userId, user, currentDate, currentMonth, currentYear, adminEmail, adminExists, _a, _b;
    var _c, _d;
    return __generator(this, function (_e) {
      switch (_e.label) {
        case 0:
          console.log('Seeding database...');
          // テストユーザーの作成
          console.log('Creating test user...');
          userId = (0, uuid_1.v4)();
          return [
            4 /*yield*/,
            prisma.user.upsert({
              where: { email: 'test@example.com' },
              update: {
                credits: 15,
              },
              create: {
                id: userId,
                email: 'test@example.com',
                name: 'Test User',
                credits: 15,
                updatedAt: new Date(),
              },
            }),
          ];
        case 1:
          user = _e.sent();
          console.log('Created test user with id: '.concat(user.id));
          // 翻訳履歴のサンプルデータ
          console.log('Creating translation history...');
          return [
            4 /*yield*/,
            prisma.translationHistory.createMany({
              data: [
                {
                  id: (0, uuid_1.v4)(),
                  userId: user.id,
                  fileName: 'presentation1.pptx',
                  pageCount: 15,
                  status: '完了',
                  creditsUsed: 15,
                  sourceLang: client_1.Language.ja,
                  targetLang: client_1.Language.en,
                  model: 'claude-3-haiku-20240307',
                  createdAt: new Date('2024-03-01'),
                  updatedAt: new Date('2024-03-01'),
                },
                {
                  id: (0, uuid_1.v4)(),
                  userId: user.id,
                  fileName: 'meeting.pptx',
                  pageCount: 10,
                  status: '完了',
                  creditsUsed: 10,
                  sourceLang: client_1.Language.ja,
                  targetLang: client_1.Language.en,
                  model: 'claude-3-haiku-20240307',
                  createdAt: new Date('2024-03-10'),
                  updatedAt: new Date('2024-03-10'),
                },
                {
                  id: (0, uuid_1.v4)(),
                  userId: user.id,
                  fileName: 'proposal.pptx',
                  pageCount: 20,
                  status: '完了',
                  creditsUsed: 20,
                  sourceLang: client_1.Language.en,
                  targetLang: client_1.Language.ja,
                  model: 'claude-3-sonnet-20240229',
                  createdAt: new Date('2024-03-15'),
                  updatedAt: new Date('2024-03-15'),
                },
              ],
              skipDuplicates: true,
            }),
          ];
        case 2:
          _e.sent();
          // アクティビティログのサンプルデータ
          console.log('Creating activity logs...');
          return [
            4 /*yield*/,
            prisma.activityLog.createMany({
              data: [
                {
                  id: (0, uuid_1.v4)(),
                  userId: user.id,
                  type: 'translation',
                  description: 'presentation1.pptxを翻訳しました',
                  createdAt: new Date('2024-03-01'),
                },
                {
                  id: (0, uuid_1.v4)(),
                  userId: user.id,
                  type: 'login',
                  description: 'ログインしました',
                  createdAt: new Date('2024-03-05'),
                },
                {
                  id: (0, uuid_1.v4)(),
                  userId: user.id,
                  type: 'translation',
                  description: 'meeting.pptxを翻訳しました',
                  createdAt: new Date('2024-03-10'),
                },
                {
                  id: (0, uuid_1.v4)(),
                  userId: user.id,
                  type: 'translation',
                  description: 'proposal.pptxを翻訳しました',
                  createdAt: new Date('2024-03-15'),
                },
              ],
              skipDuplicates: true,
            }),
          ];
        case 3:
          _e.sent();
          // 使用統計のサンプルデータ
          console.log('Creating usage statistics...');
          currentDate = new Date();
          currentMonth = currentDate.getMonth() + 1;
          currentYear = currentDate.getFullYear();
          return [
            4 /*yield*/,
            prisma.usageStatistics.upsert({
              where: {
                userId_month_year: {
                  userId: user.id,
                  month: currentMonth,
                  year: currentYear,
                },
              },
              update: {
                tokenCount: 12345,
                apiCalls: 89,
              },
              create: {
                id: (0, uuid_1.v4)(),
                userId: user.id,
                tokenCount: 12345,
                apiCalls: 89,
                month: currentMonth,
                year: currentYear,
                updatedAt: new Date(),
              },
            }),
          ];
        case 4:
          _e.sent();
          adminEmail = 'admin@example.com';
          return [
            4 /*yield*/,
            prisma.user.findUnique({
              where: { email: adminEmail },
            }),
          ];
        case 5:
          adminExists = _e.sent();
          if (adminExists) return [3 /*break*/, 8];
          _b = (_a = prisma.user).create;
          _c = {};
          _d = {
            id: 'admin-user-id',
            name: '管理者',
            email: adminEmail,
          };
          return [4 /*yield*/, (0, bcrypt_1.hash)('admin123', 10)];
        case 6:
          return [
            4 /*yield*/,
            _b.apply(_a, [((_c.data = ((_d.password = _e.sent()), (_d.role = 'ADMIN'), (_d.credits = 1000), _d)), _c)]),
          ];
        case 7:
          _e.sent();
          console.log('管理者ユーザーを作成しました');
          _e.label = 8;
        case 8:
          console.log('シードデータを投入しました');
          console.log('Seeding completed.');
          return [2 /*return*/];
      }
    });
  });
}
main()
  .catch(function (e) {
    console.error(e);
    process.exit(1);
  })
  .finally(function () {
    return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [4 /*yield*/, prisma.$disconnect()];
          case 1:
            _a.sent();
            return [2 /*return*/];
        }
      });
    });
  });
