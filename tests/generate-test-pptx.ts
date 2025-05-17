/**
 * テスト用PPTXファイルセット生成スクリプト
 * 様々なレイアウトパターンを含むテスト用PPTXファイルを生成します
 */

import * as fs from 'fs';
import * as path from 'path';
import * as pptxgenjs from 'pptxgenjs';
import { v4 as uuidv4 } from 'uuid';

// テスト用ディレクトリ
const TEST_DIR = path.join(__dirname, 'test-data');
const OUTPUT_DIR = path.join(TEST_DIR, 'pptx');

// 言語サンプルテキスト
const SAMPLE_TEXTS = {
  ja: {
    title: 'テスト用プレゼンテーション',
    subtitle: 'レイアウト調整機能のテスト',
    short: 'これは短いテキストです。',
    medium: 'これは中程度の長さのテキストです。複数の文を含んでいます。レイアウト調整機能のテストに使用します。',
    long: 'これは長いテキストです。複数の段落を含んでいます。レイアウト調整機能のテストに使用します。テキストの長さによって、テキストボックスのサイズがどのように調整されるかを確認するために使用します。また、複数行にわたるテキストの配置や行間の調整なども確認できます。',
    bullet: [
      '箇条書き項目1',
      '箇条書き項目2',
      '箇条書き項目3 - より長い項目です',
      '箇条書き項目4 - さらに長い項目で複数行になる可能性があります'
    ],
    table: [
      ['ヘッダー1', 'ヘッダー2', 'ヘッダー3'],
      ['データ1-1', 'データ1-2', 'データ1-3'],
      ['データ2-1', 'データ2-2', 'データ2-3']
    ]
  },
  en: {
    title: 'Test Presentation',
    subtitle: 'Layout Adjustment Feature Test',
    short: 'This is a short text.',
    medium: 'This is a medium-length text. It contains multiple sentences. It is used for testing the layout adjustment feature.',
    long: 'This is a long text. It contains multiple paragraphs. It is used for testing the layout adjustment feature. It is used to check how the text box size is adjusted based on the length of the text. It also helps to verify the alignment and line spacing of multi-line text.',
    bullet: [
      'Bullet point 1',
      'Bullet point 2',
      'Bullet point 3 - a longer item',
      'Bullet point 4 - an even longer item that might span multiple lines'
    ],
    table: [
      ['Header 1', 'Header 2', 'Header 3'],
      ['Data 1-1', 'Data 1-2', 'Data 1-3'],
      ['Data 2-1', 'Data 2-2', 'Data 2-3']
    ]
  },
  fr: {
    title: 'Présentation de Test',
    subtitle: 'Test de la Fonctionnalité d\'Ajustement de Mise en Page',
    short: 'Ceci est un texte court.',
    medium: 'Ceci est un texte de longueur moyenne. Il contient plusieurs phrases. Il est utilisé pour tester la fonctionnalité d\'ajustement de mise en page.',
    long: 'Ceci est un texte long. Il contient plusieurs paragraphes. Il est utilisé pour tester la fonctionnalité d\'ajustement de mise en page. Il est utilisé pour vérifier comment la taille de la zone de texte est ajustée en fonction de la longueur du texte. Il aide également à vérifier l\'alignement et l\'espacement des lignes de texte sur plusieurs lignes.',
    bullet: [
      'Point 1',
      'Point 2',
      'Point 3 - un élément plus long',
      'Point 4 - un élément encore plus long qui pourrait s\'étendre sur plusieurs lignes'
    ],
    table: [
      ['En-tête 1', 'En-tête 2', 'En-tête 3'],
      ['Données 1-1', 'Données 1-2', 'Données 1-3'],
      ['Données 2-1', 'Données 2-2', 'Données 2-3']
    ]
  },
  de: {
    title: 'Testpräsentation',
    subtitle: 'Test der Layout-Anpassungsfunktion',
    short: 'Dies ist ein kurzer Text.',
    medium: 'Dies ist ein Text mittlerer Länge. Er enthält mehrere Sätze. Er wird zum Testen der Layout-Anpassungsfunktion verwendet.',
    long: 'Dies ist ein langer Text. Er enthält mehrere Absätze. Er wird zum Testen der Layout-Anpassungsfunktion verwendet. Er wird verwendet, um zu überprüfen, wie die Größe des Textfelds basierend auf der Länge des Textes angepasst wird. Es hilft auch, die Ausrichtung und den Zeilenabstand von mehrzeiligem Text zu überprüfen.',
    bullet: [
      'Aufzählungspunkt 1',
      'Aufzählungspunkt 2',
      'Aufzählungspunkt 3 - ein längeres Element',
      'Aufzählungspunkt 4 - ein noch längeres Element, das sich über mehrere Zeilen erstrecken könnte'
    ],
    table: [
      ['Überschrift 1', 'Überschrift 2', 'Überschrift 3'],
      ['Daten 1-1', 'Daten 1-2', 'Daten 1-3'],
      ['Daten 2-1', 'Daten 2-2', 'Daten 2-3']
    ]
  },
  zh: {
    title: '测试演示文稿',
    subtitle: '布局调整功能测试',
    short: '这是一段简短的文本。',
    medium: '这是一段中等长度的文本。它包含多个句子。它用于测试布局调整功能。',
    long: '这是一段长文本。它包含多个段落。它用于测试布局调整功能。它用于检查文本框大小如何根据文本长度进行调整。它还有助于验证多行文本的对齐方式和行间距。',
    bullet: [
      '项目符号1',
      '项目符号2',
      '项目符号3 - 较长的项目',
      '项目符号4 - 更长的项目，可能跨越多行'
    ],
    table: [
      ['标题1', '标题2', '标题3'],
      ['数据1-1', '数据1-2', '数据1-3'],
      ['数据2-1', '数据2-2', '数据2-3']
    ]
  },
  ar: {
    title: 'عرض تقديمي للاختبار',
    subtitle: 'اختبار ميزة تعديل التخطيط',
    short: 'هذا نص قصير.',
    medium: 'هذا نص متوسط الطول. يحتوي على عدة جمل. يستخدم لاختبار ميزة تعديل التخطيط.',
    long: 'هذا نص طويل. يحتوي على عدة فقرات. يستخدم لاختبار ميزة تعديل التخطيط. يستخدم للتحقق من كيفية تعديل حجم مربع النص بناءً على طول النص. كما يساعد على التحقق من محاذاة وتباعد الأسطر للنص متعدد الأسطر.',
    bullet: [
      'نقطة 1',
      'نقطة 2',
      'نقطة 3 - عنصر أطول',
      'نقطة 4 - عنصر أطول قد يمتد على عدة أسطر'
    ],
    table: [
      ['عنوان 1', 'عنوان 2', 'عنوان 3'],
      ['بيانات 1-1', 'بيانات 1-2', 'بيانات 1-3'],
      ['بيانات 2-1', 'بيانات 2-2', 'بيانات 2-3']
    ]
  }
};

// レイアウトパターン定義
const LAYOUT_PATTERNS = [
  {
    name: 'simple',
    title: 'Simple Layout',
    description: 'Basic layout with title and content',
    generator: (pres: pptxgenjs, lang: string) => {
      const slide = pres.addSlide();
      
      // タイトル
      slide.addText(SAMPLE_TEXTS[lang].title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 36,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: 'center',
        color: '363636'
      });
      
      // サブタイトル
      slide.addText(SAMPLE_TEXTS[lang].subtitle, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 0.8,
        fontSize: 24,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: 'center',
        color: '666666'
      });
      
      // 本文テキスト
      slide.addText(SAMPLE_TEXTS[lang].medium, {
        x: 1,
        y: 3,
        w: 8,
        h: 2,
        fontSize: 18,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        rtl: lang === 'ar'
      });
    }
  },
  {
    name: 'complex',
    title: 'Complex Layout',
    description: 'Complex layout with multiple text boxes and shapes',
    generator: (pres: pptxgenjs, lang: string) => {
      const slide = pres.addSlide();
      
      // タイトル
      slide.addText(SAMPLE_TEXTS[lang].title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 36,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: 'center',
        color: '363636'
      });
      
      // 左側のテキストボックス
      slide.addText(SAMPLE_TEXTS[lang].medium, {
        x: 0.5,
        y: 2,
        w: 4,
        h: 2,
        fontSize: 14,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        rtl: lang === 'ar'
      });
      
      // 右側のテキストボックス
      slide.addText(SAMPLE_TEXTS[lang].long, {
        x: 5.5,
        y: 2,
        w: 4,
        h: 3,
        fontSize: 14,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        rtl: lang === 'ar'
      });
      
      // 下部の箇条書き
      slide.addText(SAMPLE_TEXTS[lang].bullet.join('\n'), {
        x: 0.5,
        y: 4.5,
        w: 4,
        h: 2,
        fontSize: 14,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        bullet: true,
        rtl: lang === 'ar'
      });
      
      // 図形
      slide.addShape('rect', {
        x: 5.5,
        y: 5.5,
        w: 1,
        h: 1,
        fill: { color: '0088CC' }
      });
      
      slide.addShape('ellipse', {
        x: 7,
        y: 5.5,
        w: 1,
        h: 1,
        fill: { color: 'FF0000' }
      });
      
      slide.addShape('triangle', {
        x: 8.5,
        y: 5.5,
        w: 1,
        h: 1,
        fill: { color: '00FF00' }
      });
    }
  },
  {
    name: 'table',
    title: 'Table Layout',
    description: 'Layout with a table',
    generator: (pres: pptxgenjs, lang: string) => {
      const slide = pres.addSlide();
      
      // タイトル
      slide.addText(SAMPLE_TEXTS[lang].title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 36,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: 'center',
        color: '363636'
      });
      
      // テーブル
      const tableData = SAMPLE_TEXTS[lang].table;
      const rows = [];
      
      // ヘッダー行
      rows.push(tableData[0].map(text => ({
        text,
        options: {
          fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
          fontSize: 16,
          bold: true,
          align: lang === 'ar' ? 'right' : 'center',
          rtl: lang === 'ar',
          fill: { color: 'F2F2F2' }
        }
      })));
      
      // データ行
      for (let i = 1; i < tableData.length; i++) {
        rows.push(tableData[i].map(text => ({
          text,
          options: {
            fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
            fontSize: 14,
            align: lang === 'ar' ? 'right' : 'center',
            rtl: lang === 'ar'
          }
        })));
      }
      
      slide.addTable(rows, {
        x: 1,
        y: 2,
        w: 8,
        h: 3,
        border: { pt: 1, color: '666666' }
      });
      
      // 説明テキスト
      slide.addText(SAMPLE_TEXTS[lang].medium, {
        x: 1,
        y: 5.5,
        w: 8,
        h: 1,
        fontSize: 14,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        rtl: lang === 'ar'
      });
    }
  },
  {
    name: 'mixed',
    title: 'Mixed Layout',
    description: 'Mixed layout with various elements',
    generator: (pres: pptxgenjs, lang: string) => {
      const slide = pres.addSlide();
      
      // タイトル
      slide.addText(SAMPLE_TEXTS[lang].title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 36,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: 'center',
        color: '363636'
      });
      
      // 左上のテキストボックス
      slide.addText(SAMPLE_TEXTS[lang].short, {
        x: 0.5,
        y: 2,
        w: 4,
        h: 1,
        fontSize: 16,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        rtl: lang === 'ar'
      });
      
      // 右上のテキストボックス
      slide.addText(SAMPLE_TEXTS[lang].medium, {
        x: 5.5,
        y: 2,
        w: 4,
        h: 2,
        fontSize: 14,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        rtl: lang === 'ar'
      });
      
      // 左下の箇条書き
      slide.addText(SAMPLE_TEXTS[lang].bullet.join('\n'), {
        x: 0.5,
        y: 3.5,
        w: 4,
        h: 2,
        fontSize: 14,
        fontFace: lang === 'ja' || lang === 'zh' ? 'Yu Gothic' : 'Arial',
        align: lang === 'ar' ? 'right' : 'left',
        color: '000000',
        bullet: true,
        rtl: lang === 'ar'
      });
      
      // 右下のテキストボックス（縦書き - 日本語と中国語のみ）
      if (lang === 'ja' || lang === 'zh') {
        slide.addText(SAMPLE_TEXTS[lang].short, {
          x: 5.5,
          y: 4.5,
          w: 1,
          h: 4,
          fontSize: 16,
          fontFace: 'Yu Gothic',
          align: 'center',
          color: '000000',
          vert: true
        });
      } else {
        slide.addText(SAMPLE_TEXTS[lang].short, {
          x: 5.5,
          y: 4.5,
          w: 4,
          h: 1,
          fontSize: 16,
          fontFace: 'Arial',
          align: lang === 'ar' ? 'right' : 'left',
          color: '000000',
          rtl: lang === 'ar'
        });
      }
      
      // 図形
      slide.addShape('rect', {
        x: 7,
        y: 4.5,
        w: 1,
        h: 1,
        fill: { color: '0088CC' }
      });
      
      slide.addShape('ellipse', {
        x: 8.5,
        y: 4.5,
        w: 1,
        h: 1,
        fill: { color: 'FF0000' }
      });
    }
  }
];

/**
 * テスト用PPTXファイルを生成する
 */
async function generateTestPPTX() {
  console.log('テスト用PPTXファイルの生成を開始します...');
  
  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // 言語ごとにPPTXファイルを生成
  const languages = Object.keys(SAMPLE_TEXTS);
  
  for (const lang of languages) {
    console.log(`言語 ${lang} のPPTXファイルを生成しています...`);
    
    // レイアウトパターンごとにPPTXファイルを生成
    for (const pattern of LAYOUT_PATTERNS) {
      console.log(`  パターン ${pattern.name} を生成しています...`);
      
      // プレゼンテーションを作成
      const pres = new pptxgenjs();
      
      // スライドを生成
      pattern.generator(pres, lang);
      
      // ファイル名
      const fileName = `test_${lang}_${pattern.name}.pptx`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      
      // ファイルを保存
      await pres.writeFile({ fileName: filePath });
      
      console.log(`  ファイルを保存しました: ${filePath}`);
    }
  }
  
  // 複合ファイルを生成（すべてのレイアウトパターンを含む）
  for (const lang of languages) {
    console.log(`言語 ${lang} の複合PPTXファイルを生成しています...`);
    
    // プレゼンテーションを作成
    const pres = new pptxgenjs();
    
    // すべてのパターンを含む
    for (const pattern of LAYOUT_PATTERNS) {
      pattern.generator(pres, lang);
    }
    
    // ファイル名
    const fileName = `test_${lang}_all.pptx`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    
    // ファイルを保存
    await pres.writeFile({ fileName: filePath });
    
    console.log(`  ファイルを保存しました: ${filePath}`);
  }
  
  console.log('テスト用PPTXファイルの生成が完了しました。');
  console.log(`出力ディレクトリ: ${OUTPUT_DIR}`);
}

// スクリプトを実行
generateTestPPTX().catch(console.error);
