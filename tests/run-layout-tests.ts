/**
 * レイアウト調整機能のテスト実行スクリプト
 * テスト用PPTXファイルの生成、レイアウト調整、視覚的差分分析を実行します
 */

import * as path from 'path';
import * as fs from 'fs';
import { getPPTXLayoutAdjuster } from '../lib/layout/pptx-layout-adjuster';
import { getPPTXLayoutBridge } from '../lib/layout/pptx-layout-bridge';
import { getVisualDiffAnalyzer } from './visual-diff-analyzer';
import { LanguageCode } from '../lib/layout/text-metrics';

// テスト用ディレクトリ
const TEST_DIR = path.join(__dirname, 'test-data');
const PPTX_DIR = path.join(TEST_DIR, 'pptx');
const OUTPUT_DIR = path.join(TEST_DIR, 'output');
const REPORT_DIR = path.join(TEST_DIR, 'reports');

// 言語ペア
const LANGUAGE_PAIRS = [
  { source: 'ja', target: 'en' },
  { source: 'en', target: 'ja' },
  { source: 'ja', target: 'zh' },
  { source: 'en', target: 'fr' },
  { source: 'en', target: 'de' },
  { source: 'en', target: 'ar' }
];

// テスト実行関数
async function runLayoutTests() {
  console.log('レイアウト調整機能のテストを開始します...');
  
  try {
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    if (!fs.existsSync(PPTX_DIR)) {
      fs.mkdirSync(PPTX_DIR, { recursive: true });
    }
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
    }
    
    // テスト用PPTXファイルを生成
    console.log('\n--- テスト用PPTXファイルの生成 ---');
    console.log('テスト用PPTXファイルを生成するには、以下のコマンドを実行してください:');
    console.log('npx ts-node tests/generate-test-pptx.ts');
    
    // PPTXファイルが存在するか確認
    const pptxFiles = fs.readdirSync(PPTX_DIR).filter(file => file.endsWith('.pptx'));
    if (pptxFiles.length === 0) {
      console.error('テスト用PPTXファイルが見つかりません。先にテスト用PPTXファイルを生成してください。');
      return;
    }
    
    console.log(`${pptxFiles.length}個のテスト用PPTXファイルが見つかりました。`);
    
    // レイアウト調整オプション
    const options = {
      enableAutoResize: true,
      resizeStrategy: 'both' as 'both' | 'width' | 'height',
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
    
    // レイアウト調整とテスト実行
    console.log('\n--- レイアウト調整とテスト実行 ---');
    
    // 視覚的差分分析ツールを初期化
    const visualDiffAnalyzer = getVisualDiffAnalyzer({
      outputDir: path.join(REPORT_DIR, 'visual-diff'),
      deltaEThreshold: 2.0,
      generateDiffImages: true
    });
    
    // 各言語ペアでテスト
    for (const pair of LANGUAGE_PAIRS) {
      console.log(`\n言語ペア: ${pair.source} → ${pair.target}`);
      
      // 該当する言語のPPTXファイルを検索
      const sourceFiles = pptxFiles.filter(file => file.includes(`_${pair.source}_`));
      
      if (sourceFiles.length === 0) {
        console.log(`  言語 ${pair.source} のPPTXファイルが見つかりません。スキップします。`);
        continue;
      }
      
      console.log(`  ${sourceFiles.length}個のファイルが見つかりました。`);
      
      // 各ファイルを処理
      for (const sourceFile of sourceFiles) {
        const sourceFilePath = path.join(PPTX_DIR, sourceFile);
        const outputFileName = sourceFile.replace(`.pptx`, `_${pair.target}.pptx`);
        const outputFilePath = path.join(OUTPUT_DIR, outputFileName);
        
        console.log(`\n  ファイル: ${sourceFile}`);
        console.log(`  出力ファイル: ${outputFileName}`);
        
        // 翻訳テキスト情報を生成（実際のアプリケーションでは翻訳APIから取得）
        const translations = generateMockTranslations(pair.source as LanguageCode, pair.target as LanguageCode);
        
        // レイアウト調整を実行
        console.log('  レイアウト調整を開始します...');
        
        const bridge = getPPTXLayoutBridge();
        const result = await bridge.adjustPPTXLayout(
          sourceFilePath,
          outputFilePath,
          translations,
          pair.source as LanguageCode,
          pair.target as LanguageCode,
          options
        );
        
        console.log(`  レイアウト調整結果: ${result.success ? '成功' : '失敗'}`);
        
        if (result.warnings.length > 0) {
          console.log('  警告:');
          for (const warning of result.warnings) {
            console.log(`    - ${warning}`);
          }
        }
        
        if (result.errors.length > 0) {
          console.log('  エラー:');
          for (const error of result.errors) {
            console.log(`    - ${error}`);
          }
          continue;
        }
        
        // 視覚的差分分析を実行
        console.log('  視覚的差分分析を開始します...');
        
        const diffResult = await visualDiffAnalyzer.comparePPTX(
          sourceFilePath,
          outputFilePath
        );
        
        console.log(`  視覚的差分分析結果: ${diffResult.success ? '成功' : '失敗'}`);
        console.log(`  差分サマリー:`);
        console.log(`    - 合計スライド数: ${diffResult.diffSummary.totalSlides}`);
        console.log(`    - 差分があるスライド数: ${diffResult.diffSummary.slidesWithDiff}`);
        console.log(`    - 平均色差（ΔE）: ${diffResult.diffSummary.averageDeltaE.toFixed(2)}`);
        console.log(`    - 最大色差（ΔE）: ${diffResult.diffSummary.maxDeltaE.toFixed(2)}`);
        console.log(`    - 差分ピクセルの割合: ${diffResult.diffSummary.diffPercentage.toFixed(2)}%`);
        
        if (diffResult.reportPath) {
          console.log(`  レポートパス: ${diffResult.reportPath}`);
        }
        
        if (diffResult.diffImagesDir) {
          console.log(`  差分画像ディレクトリ: ${diffResult.diffImagesDir}`);
        }
      }
    }
    
    console.log('\nレイアウト調整機能のテストが完了しました。');
    console.log(`出力ディレクトリ: ${OUTPUT_DIR}`);
    console.log(`レポートディレクトリ: ${REPORT_DIR}`);
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  }
}

/**
 * モックの翻訳テキスト情報を生成する
 * @param sourceLanguage 翻訳元言語コード
 * @param targetLanguage 翻訳先言語コード
 * @returns 翻訳テキスト情報の配列
 */
function generateMockTranslations(sourceLanguage: LanguageCode, targetLanguage: LanguageCode) {
  // 言語ごとのサンプルテキスト
  const sampleTexts = {
    ja: {
      title: 'テスト用プレゼンテーション',
      subtitle: 'レイアウト調整機能のテスト',
      short: 'これは短いテキストです。',
      medium: 'これは中程度の長さのテキストです。複数の文を含んでいます。レイアウト調整機能のテストに使用します。',
      long: 'これは長いテキストです。複数の段落を含んでいます。レイアウト調整機能のテストに使用します。テキストの長さによって、テキストボックスのサイズがどのように調整されるかを確認するために使用します。また、複数行にわたるテキストの配置や行間の調整なども確認できます。'
    },
    en: {
      title: 'Test Presentation',
      subtitle: 'Layout Adjustment Feature Test',
      short: 'This is a short text.',
      medium: 'This is a medium-length text. It contains multiple sentences. It is used for testing the layout adjustment feature.',
      long: 'This is a long text. It contains multiple paragraphs. It is used for testing the layout adjustment feature. It is used to check how the text box size is adjusted based on the length of the text. It also helps to verify the alignment and line spacing of multi-line text.'
    },
    fr: {
      title: 'Présentation de Test',
      subtitle: 'Test de la Fonctionnalité d\'Ajustement de Mise en Page',
      short: 'Ceci est un texte court.',
      medium: 'Ceci est un texte de longueur moyenne. Il contient plusieurs phrases. Il est utilisé pour tester la fonctionnalité d\'ajustement de mise en page.',
      long: 'Ceci est un texte long. Il contient plusieurs paragraphes. Il est utilisé pour tester la fonctionnalité d\'ajustement de mise en page. Il est utilisé pour vérifier comment la taille de la zone de texte est ajustée en fonction de la longueur du texte. Il aide également à vérifier l\'alignement et l\'espacement des lignes de texte sur plusieurs lignes.'
    },
    de: {
      title: 'Testpräsentation',
      subtitle: 'Test der Layout-Anpassungsfunktion',
      short: 'Dies ist ein kurzer Text.',
      medium: 'Dies ist ein Text mittlerer Länge. Er enthält mehrere Sätze. Er wird zum Testen der Layout-Anpassungsfunktion verwendet.',
      long: 'Dies ist ein langer Text. Er enthält mehrere Absätze. Er wird zum Testen der Layout-Anpassungsfunktion verwendet. Er wird verwendet, um zu überprüfen, wie die Größe des Textfelds basierend auf der Länge des Textes angepasst wird. Es hilft auch, die Ausrichtung und den Zeilenabstand von mehrzeiligem Text zu überprüfen.'
    },
    zh: {
      title: '测试演示文稿',
      subtitle: '布局调整功能测试',
      short: '这是一段简短的文本。',
      medium: '这是一段中等长度的文本。它包含多个句子。它用于测试布局调整功能。',
      long: '这是一段长文本。它包含多个段落。它用于测试布局调整功能。它用于检查文本框大小如何根据文本长度进行调整。它还有助于验证多行文本的对齐方式和行间距。'
    },
    ar: {
      title: 'عرض تقديمي للاختبار',
      subtitle: 'اختبار ميزة تعديل التخطيط',
      short: 'هذا نص قصير.',
      medium: 'هذا نص متوسط الطول. يحتوي على عدة جمل. يستخدم لاختبار ميزة تعديل التخطيط.',
      long: 'هذا نص طويل. يحتوي على عدة فقرات. يستخدم لاختبار ميزة تعديل التخطيط. يستخدم للتحقق من كيفية تعديل حجم مربع النص بناءً على طول النص. كما يساعد على التحقق من محاذاة وتباعد الأسطر للنص متعدد الأسطر.'
    }
  };
  
  // モックの翻訳テキスト情報
  return [
    {
      slideIndex: 0,
      shapeId: '1',
      originalText: sampleTexts[sourceLanguage].title,
      translatedText: sampleTexts[targetLanguage].title
    },
    {
      slideIndex: 0,
      shapeId: '2',
      originalText: sampleTexts[sourceLanguage].subtitle,
      translatedText: sampleTexts[targetLanguage].subtitle
    },
    {
      slideIndex: 0,
      shapeId: '3',
      originalText: sampleTexts[sourceLanguage].medium,
      translatedText: sampleTexts[targetLanguage].medium
    },
    {
      slideIndex: 1,
      shapeId: '1',
      originalText: sampleTexts[sourceLanguage].short,
      translatedText: sampleTexts[targetLanguage].short
    },
    {
      slideIndex: 1,
      shapeId: '2',
      originalText: sampleTexts[sourceLanguage].medium,
      translatedText: sampleTexts[targetLanguage].medium
    },
    {
      slideIndex: 1,
      shapeId: '3',
      originalText: sampleTexts[sourceLanguage].long,
      translatedText: sampleTexts[targetLanguage].long
    }
  ];
}

// スクリプトを実行
if (require.main === module) {
  runLayoutTests().catch(console.error);
}
