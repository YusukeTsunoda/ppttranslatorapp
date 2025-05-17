/**
 * StreamingPPTXParserのテストスクリプト
 */
import * as fs from 'fs';
import * as path from 'path';
// import { Readable } from 'stream'; // 未使用のため削除
import { StreamingPPTXParser } from './streaming-parser';
import { PPTXProfiler } from './profiler';

// テスト用の一時ディレクトリ
const TEST_OUTPUT_DIR = path.join(process.cwd(), 'test-output');

// テスト用のPPTXファイル
const TEST_FILES = [
  path.join(process.cwd(), 'cypress/fixtures/sample.pptx'),
];

/**
 * ファイルサイズを取得（MB単位）
 */
function getFileSizeMB(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
}

/**
 * 指定されたPPTXファイルをパースするテスト
 */
async function testParsePPTX(filePath: string): Promise<void> {
  console.log(`\n===== テスト: ${path.basename(filePath)} (${getFileSizeMB(filePath).toFixed(2)}MB) =====`);
  
  // 出力ディレクトリの準備
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }
  
  const parser = StreamingPPTXParser.getInstance();
  
  try {
    // ファイルをストリームとして読み込む
    const fileStream = fs.createReadStream(filePath);
    
    console.log('パース開始...');
    const startTime = Date.now();
    
    // ストリーミングパーサーでパース
    const result = await parser.parsePPTXStream(fileStream, TEST_OUTPUT_DIR);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`パース完了: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`);
    console.log(`スライド数: ${result.totalSlides}`);
    console.log(`メタデータ: ${JSON.stringify(result.metadata, null, 2)}`);
    
    // 最初のスライドの情報を表示
    if (result.slides.length > 0) {
      const firstSlide = result.slides[0];
      if (firstSlide) {
        console.log(`\n最初のスライド:`);
        console.log(`- インデックス: ${firstSlide.index}`);
        console.log(`- 画像URL: ${firstSlide.imageUrl}`);
        console.log(`- テキスト要素数: ${firstSlide.textElements.length}`);
        console.log(`- 図形数: ${firstSlide.shapes.length}`);
        
        // 最初のテキスト要素を表示
        if (firstSlide.textElements.length > 0) {
          const firstText = firstSlide.textElements[0];
          if (firstText) {
            console.log(`\n最初のテキスト要素:`);
            console.log(`- テキスト: ${firstText.text}`);
            console.log(`- 位置: x=${firstText.position.x}, y=${firstText.position.y}`);
            console.log(`- サイズ: width=${firstText.position.width}, height=${firstText.position.height}`);
          }
        }
      }
    }
    
    console.log('\nパフォーマンスメトリクス:');
    const profiler = PPTXProfiler.getInstance();
    const metrics = profiler.getAllMetrics();
    
    // 最新のメトリクスを表示
    if (metrics.length > 0) {
      const latestMetric = metrics[metrics.length - 1];
      if (latestMetric) {
        console.log(`- 実行時間: ${latestMetric.duration.toFixed(2)}ms`);
        console.log(`- メモリ使用量(差分): RSS=${latestMetric.memoryDiff.rss.toFixed(2)}MB, Heap=${latestMetric.memoryDiff.heapUsed.toFixed(2)}MB`);
      }
    }
    
    console.log('===== テスト完了 =====\n');
  } catch (error) {
    console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

/**
 * メインテスト関数
 */
async function runTests(): Promise<void> {
  console.log('StreamingPPTXParser テスト開始');
  
  // 各テストファイルに対してテスト実行
  for (const filePath of TEST_FILES) {
    if (fs.existsSync(filePath)) {
      await testParsePPTX(filePath);
    } else {
      console.error(`ファイルが見つかりません: ${filePath}`);
    }
  }
  
  console.log('すべてのテスト完了');
}

// テスト実行
runTests().catch(error => {
  console.error('テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});
