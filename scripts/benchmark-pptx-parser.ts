/**
 * StreamingPPTXParserのパフォーマンスベンチマークスクリプト
 * 様々なサイズのPPTXファイルを使用してパフォーマンスを測定します
 */

import { StreamingPPTXParser } from '../lib/pptx/streaming-parser';
import { performance } from 'perf_hooks';
import path from 'path';
import fs from 'fs';
import os from 'os';

// メモリ使用量を取得する関数
function getMemoryUsage(): { heapUsed: number; heapTotal: number; rss: number } {
  const memoryUsage = process.memoryUsage();
  return {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
    rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
  };
}

// ベンチマーク結果の型定義
interface BenchmarkResult {
  filename: string;
  fileSize: number; // バイト
  initialParseTime: number; // ミリ秒
  cachedParseTime: number; // ミリ秒
  forcedReparseTime: number; // ミリ秒
  slideCountTime: number; // ミリ秒
  metadataTime: number; // ミリ秒
  memoryBefore: ReturnType<typeof getMemoryUsage>;
  memoryAfterInitial: ReturnType<typeof getMemoryUsage>;
  memoryAfterCached: ReturnType<typeof getMemoryUsage>;
  memoryAfterForced: ReturnType<typeof getMemoryUsage>;
  slideCount: number;
  textElementCount: number;
  shapeCount: number;
  metadata?: any;
}

// ベンチマーク関数
async function runBenchmark(filePath: string): Promise<BenchmarkResult> {
  const parser = new StreamingPPTXParser({
    batchSize: 10, // デフォルトのバッチサイズ
  });

  // ファイルサイズを取得
  const fileSize = fs.statSync(filePath).size;
  const filename = path.basename(filePath);

  console.log(`\n===== ベンチマーク: ${filename} (${Math.round(fileSize / 1024)} KB) =====`);

  // 初期メモリ使用量
  const memoryBefore = getMemoryUsage();
  console.log(`メモリ使用量（初期）: ${memoryBefore.heapUsed} MB`);

  // 初回パース（キャッシュなし）
  console.time('初回パース（キャッシュなし）');
  const startInitial = Date.now();
  const result1 = await parser.parsePPTX(filePath);
  const initialParseTime = Date.now() - startInitial;
  console.timeEnd('初回パース（キャッシュなし）');

  // パース後のメモリ使用量
  const memoryAfterInitial = getMemoryUsage();
  console.log(`メモリ使用量（初回パース後）: ${memoryAfterInitial.heapUsed} MB (${memoryAfterInitial.heapUsed - memoryBefore.heapUsed} MB増加)`);

  // 2回目のパース（キャッシュあり）
  console.time('2回目パース（キャッシュあり）');
  const startCached = Date.now();
  const result2 = await parser.parsePPTX(filePath);
  const cachedParseTime = Date.now() - startCached;
  console.timeEnd('2回目パース（キャッシュあり）');

  // キャッシュ使用後のメモリ使用量
  const memoryAfterCached = getMemoryUsage();
  console.log(`メモリ使用量（キャッシュ使用後）: ${memoryAfterCached.heapUsed} MB (${memoryAfterCached.heapUsed - memoryAfterInitial.heapUsed} MB増加)`);

  // 強制再解析
  console.time('強制再解析');
  const startForced = Date.now();
  const result3 = await parser.parsePPTX(filePath, { forceReparse: true });
  const forcedReparseTime = Date.now() - startForced;
  console.timeEnd('強制再解析');

  // 強制再解析後のメモリ使用量
  const memoryAfterForced = getMemoryUsage();
  console.log(`メモリ使用量（強制再解析後）: ${memoryAfterForced.heapUsed} MB (${memoryAfterForced.heapUsed - memoryAfterCached.heapUsed} MB増加)`);

  // getSlideCountのパフォーマンス測定
  console.time('getSlideCount');
  const startSlideCount = Date.now();
  const slideCountResult = await parser.getSlideCount(filePath);
  const slideCountTime = Date.now() - startSlideCount;
  console.timeEnd('getSlideCount');
  console.log(`スライド数取得結果: ${slideCountResult.count} スライド`);
  
  // getMetadataのパフォーマンス測定
  console.time('getMetadata');
  const startMetadata = Date.now();
  const metadata = await parser.getMetadata(filePath);
  const metadataTime = Date.now() - startMetadata;
  console.timeEnd('getMetadata');
  console.log('メタデータ取得結果:', metadata);

  // 結果の集計
  const slideCount = result1.slides.length;
  let textElementCount = 0;
  let shapeCount = 0;

  for (const slide of result1.slides) {
    textElementCount += slide.textElements?.length || 0;
    shapeCount += slide.shapes?.length || 0;
  }

  console.log(`スライド数: ${slideCount}`);
  console.log(`テキスト要素数: ${textElementCount}`);
  console.log(`シェイプ数: ${shapeCount}`);

  // キャッシュ統計は実装されていないためスキップ
  console.log('キャッシュ統計: 実装されていません');

  return {
    filename,
    fileSize,
    initialParseTime,
    cachedParseTime,
    forcedReparseTime,
    slideCountTime,
    metadataTime,
    memoryBefore,
    memoryAfterInitial,
    memoryAfterCached,
    memoryAfterForced,
    slideCount,
    textElementCount,
    shapeCount,
    metadata,
  };
}

// バッチサイズのパフォーマンス比較
async function testBatchSizes(filePath: string, batchSizes: number[]): Promise<void> {
  const filename = path.basename(filePath);
  console.log(`\n===== バッチサイズ比較: ${filename} =====`);

  for (const batchSize of batchSizes) {
    const parser = new StreamingPPTXParser({
      batchSize,
    });

    // キャッシュクリアは実装されていないためスキップ

    console.log(`\n--- バッチサイズ: ${batchSize} ---`);
    console.time(`パース時間（バッチサイズ: ${batchSize}）`);
    const startTime = Date.now();
    const result = await parser.parsePPTX(filePath, { forceReparse: true });
    const parseTime = Date.now() - startTime;
    console.timeEnd(`パース時間（バッチサイズ: ${batchSize}）`);

    console.log(`スライド数: ${result.slides.length}`);
    console.log(`処理時間: ${parseTime} ms`);

    // リソース解放は実装されていないためスキップ
  }
}

// メイン関数
async function main() {
  try {
    // テストファイルのディレクトリ
    const testFilesDir = path.join(__dirname, '..', 'tests', 'fixtures', 'pptx');
    
    // テストファイルのディレクトリが存在しない場合は作成
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
      console.log(`テストファイルディレクトリを作成しました: ${testFilesDir}`);
      console.log('テストファイルを配置してください。');
      return;
    }

    // テストファイルのリストを取得
    const files = fs.readdirSync(testFilesDir)
      .filter(file => file.endsWith('.pptx'))
      .map(file => path.join(testFilesDir, file));

    if (files.length === 0) {
      console.log(`テストファイルが見つかりません。${testFilesDir} にPPTXファイルを配置してください。`);
      return;
    }

    console.log(`${files.length}個のテストファイルが見つかりました。`);

    // 各ファイルでベンチマークを実行
    const results: BenchmarkResult[] = [];
    for (const file of files) {
      const result = await runBenchmark(file);
      results.push(result);
    }

    // 結果のサマリーを表示
    console.log('\n===== ベンチマーク結果サマリー =====');
    console.table(results.map(r => ({
      ファイル名: r.filename,
      サイズ: `${Math.round(r.fileSize / 1024)} KB`,
      スライド数: r.slideCount,
      初回パース: `${r.initialParseTime} ms`,
      キャッシュ使用: `${r.cachedParseTime} ms`,
      強制再解析: `${r.forcedReparseTime} ms`,
      スライド数取得: `${r.slideCountTime} ms`,
      メタデータ取得: `${r.metadataTime} ms`,
      キャッシュ効率: `${Math.round((1 - r.cachedParseTime / r.initialParseTime) * 100)}%`,
      メモリ増加: `${Math.round((r.memoryAfterInitial.heapUsed - r.memoryBefore.heapUsed) * 100) / 100} MB`,
    })));

    // バッチサイズのテスト（最大のファイルで実行）
    const largestFile = files.reduce((a, b) => fs.statSync(a).size > fs.statSync(b).size ? a : b);
    await testBatchSizes(largestFile, [1, 5, 10, 20, 50]);

  } catch (error) {
    console.error('ベンチマーク実行中にエラーが発生しました:', error);
  }
}

// スクリプト実行
main().catch(console.error);
