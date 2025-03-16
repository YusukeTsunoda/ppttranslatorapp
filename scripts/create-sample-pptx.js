const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

// サンプルPPTXファイルを作成する関数
async function createSamplePptx() {
  try {
    // 新しいプレゼンテーションを作成
    const pptx = new PptxGenJS();

    // スライド1を追加
    const slide1 = pptx.addSlide();
    slide1.addText('サンプルテキスト1', { 
      x: 1, 
      y: 1, 
      w: 4, 
      h: 1, 
      fontSize: 24,
      color: '363636' 
    });
    slide1.addText('サンプルテキスト2', { 
      x: 1, 
      y: 2, 
      w: 4, 
      h: 1, 
      fontSize: 18,
      color: '363636' 
    });

    // スライド2を追加
    const slide2 = pptx.addSlide();
    slide2.addText('サンプルテキスト3', { 
      x: 1, 
      y: 1, 
      w: 4, 
      h: 1, 
      fontSize: 24,
      color: '363636' 
    });

    // ファイルの保存先パス
    const outputPath = path.join(__dirname, '..', 'cypress', 'fixtures', 'sample.pptx');
    
    // ディレクトリが存在することを確認
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // ファイルを保存
    await pptx.writeFile({ fileName: outputPath });
    console.log(`サンプルPPTXファイルを作成しました: ${outputPath}`);
  } catch (error) {
    console.error('PPTXファイルの作成中にエラーが発生しました:', error);
  }
}

// スクリプトを実行
createSamplePptx(); 