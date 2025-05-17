/**
 * PPTXレイアウト調整機能のテスト
 */

import * as path from 'path';
import * as fs from 'fs';
import { getPPTXLayoutAdjuster } from '../lib/layout/pptx-layout-adjuster';
import { getPPTXLayoutBridge } from '../lib/layout/pptx-layout-bridge';
import { LanguageCode } from '../lib/layout/text-metrics';

// テスト用の翻訳データ
const testTranslations = [
  {
    slideIndex: 0,
    shapeId: '1',
    originalText: 'こんにちは、世界！',
    translatedText: 'Hello, World!'
  },
  {
    slideIndex: 0,
    shapeId: '2',
    originalText: 'PPTXレイアウト調整のテスト',
    translatedText: 'PPTX Layout Adjustment Test'
  },
  {
    slideIndex: 1,
    shapeId: '1',
    originalText: '自動サイズ調整機能',
    translatedText: 'Automatic Size Adjustment Feature'
  }
];

// テスト実行関数
async function runTest() {
  console.log('PPTXレイアウト調整機能のテストを開始します...');
  
  try {
    // テスト用のディレクトリパス
    const testDir = path.join(__dirname, 'test-data');
    const outputDir = path.join(testDir, 'output');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // テスト用のファイルパス
    const inputFilePath = path.join(testDir, 'test.pptx');
    const outputFilePath = path.join(outputDir, 'test_adjusted.pptx');
    
    // テスト用のファイルが存在するか確認
    if (!fs.existsSync(inputFilePath)) {
      console.error(`テスト用のファイルが見つかりません: ${inputFilePath}`);
      console.log('テスト用のPPTXファイルを用意して、再度テストを実行してください。');
      return;
    }
    
    console.log(`入力ファイル: ${inputFilePath}`);
    console.log(`出力ファイル: ${outputFilePath}`);
    
    // 言語コード
    const sourceLanguage: LanguageCode = 'ja';
    const targetLanguage: LanguageCode = 'en';
    
    console.log(`翻訳言語: ${sourceLanguage} → ${targetLanguage}`);
    
    // レイアウト調整オプション
    const options = {
      enableAutoResize: true,
      resizeStrategy: 'both',
      maxWidthExpansion: 1.5,
      maxHeightExpansion: 1.5,
      applyFontMapping: true,
      applyLanguageOffset: true,
      detectCollisions: true,
      safetyMargin: 0.1,
      preserveOriginalFile: true,
      generatePreviewImages: false,
      applyFontEmbedding: false,
      generateReport: true
    };
    
    console.log('レイアウト調整オプション:', options);
    
    // TypeScript側のレイアウト調整機能を使用
    console.log('\n--- TypeScript側のレイアウト調整機能を使用 ---');
    const adjuster = getPPTXLayoutAdjuster(options);
    
    console.log('レイアウト調整を開始します...');
    const tsResult = await adjuster.adjustPPTXLayout(
      inputFilePath,
      outputFilePath,
      testTranslations,
      sourceLanguage,
      targetLanguage
    );
    
    console.log('レイアウト調整結果:', tsResult);
    
    // Python側のレイアウト調整機能を使用
    console.log('\n--- Python側のレイアウト調整機能を使用 ---');
    const bridge = getPPTXLayoutBridge();
    
    console.log('レイアウト調整を開始します...');
    const pyResult = await bridge.adjustPPTXLayout(
      inputFilePath,
      path.join(outputDir, 'test_adjusted_py.pptx'),
      testTranslations,
      sourceLanguage,
      targetLanguage,
      options
    );
    
    console.log('レイアウト調整結果:', pyResult);
    
    console.log('\nPPTXレイアウト調整機能のテストが完了しました。');
    console.log(`出力ディレクトリを確認してください: ${outputDir}`);
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  }
}

// テストを実行
runTest().catch(console.error);
