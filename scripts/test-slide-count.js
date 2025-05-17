/**
 * StreamingPPTXParserのgetSlideCountとgetMetadataメソッドのパフォーマンステスト
 */

const { StreamingPPTXParser } = require('../dist/lib/pptx/streaming-parser');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// メモリ使用量を取得する関数
function getMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  return {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
    rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
  };
}

// テスト関数
async function testMethods(filePath) {
  const parser = new StreamingPPTXParser({
    pythonPath: 'python3',
    scriptPath: path.join(__dirname, 'simple_pptx_parser.py')
  });

  // ファイルサイズを取得
  const fileSize = fs.statSync(filePath).size;
  const filename = path.basename(filePath);

  console.log(`\n===== テスト: ${filename} (${Math.round(fileSize / 1024)} KB) =====`);

  // 初期メモリ使用量
  const memoryBefore = getMemoryUsage();
  console.log(`メモリ使用量（初期）: ${memoryBefore.heapUsed} MB`);

  // getSlideCountのパフォーマンス測定
  console.log('スライド数取得開始...');
  console.time('getSlideCount');
  const startSlideCount = performance.now();
  try {
    const slideCountResult = await parser.getSlideCount(filePath);
    const slideCountTime = performance.now() - startSlideCount;
    console.timeEnd('getSlideCount');
    console.log(`スライド数取得結果: ${slideCountResult.count} スライド`);
  } catch (error) {
    console.error('スライド数取得エラー:', error);
    return {
      filename,
      fileSize,
      slideCountTime: 0,
      metadataTime: 0,
      slideCount: 0,
      metadata: {},
      memoryBefore,
      memoryAfter: getMemoryUsage()
    };
  }
  
  // getMetadataのパフォーマンス測定
  console.log('メタデータ取得開始...');
  console.time('getMetadata');
  const startMetadata = performance.now();
  let metadata = {};
  let metadataTime = 0;
  try {
    metadata = await parser.getMetadata(filePath);
    metadataTime = performance.now() - startMetadata;
    console.timeEnd('getMetadata');
    console.log('メタデータ取得結果:', metadata);
  } catch (error) {
    console.error('メタデータ取得エラー:', error);
  }

  // 最終メモリ使用量
  const memoryAfter = getMemoryUsage();
  console.log(`メモリ使用量（テスト後）: ${memoryAfter.heapUsed} MB (${memoryAfter.heapUsed - memoryBefore.heapUsed} MB増加)`);

  return {
    filename,
    fileSize,
    slideCountTime,
    metadataTime,
    slideCount: slideCountResult.count,
    metadata,
    memoryBefore,
    memoryAfter
  };
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

    // 各ファイルでテストを実行
    const results = [];
    for (const file of files) {
      const result = await testMethods(file);
      results.push(result);
    }

    // 結果のサマリーを表示
    console.log('\n===== テスト結果サマリー =====');
    console.table(results.map(r => ({
      ファイル名: r.filename,
      サイズ: `${Math.round(r.fileSize / 1024)} KB`,
      スライド数: r.slideCount,
      スライド数取得時間: `${r.slideCountTime.toFixed(2)} ms`,
      メタデータ取得時間: `${r.metadataTime.toFixed(2)} ms`,
      メモリ増加: `${(r.memoryAfter.heapUsed - r.memoryBefore.heapUsed).toFixed(2)} MB`,
    })));

  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
  }
}

// スクリプト実行
main().catch(console.error);
