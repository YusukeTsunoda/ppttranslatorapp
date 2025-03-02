import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';

// テキスト抽出関数
async function extractTextFromPptx(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const slideTexts: string[] = [];
  const slideFiles: string[] = [];
  
  // スライドファイルを探す
  Object.keys(zip.files).forEach(filename => {
    if (filename.match(/ppt\/slides\/slide[0-9]+\.xml/)) {
      slideFiles.push(filename);
    }
  });
  
  // スライド番号でソート
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide([0-9]+)\.xml/)?.[1] || '0');
    const numB = parseInt(b.match(/slide([0-9]+)\.xml/)?.[1] || '0');
    return numA - numB;
  });
  
  // 各スライドからテキストを抽出
  for (const slideFile of slideFiles) {
    const content = await zip.file(slideFile)?.async('text');
    if (content) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      // テキスト要素を取得
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      let slideText = '';
      
      for (let i = 0; i < textNodes.length; i++) {
        const textContent = textNodes[i].textContent;
        if (textContent) {
          slideText += textContent + ' ';
        }
      }
      
      slideTexts.push(slideText.trim());
    } else {
      slideTexts.push('');
    }
  }
  
  return slideTexts;
}

export async function parsePptx(filePath: string, outputDir: string) {
  try {
    // PPTXファイルを読み込む
    const fileBuffer = await fs.readFile(filePath);
    
    // テキスト抽出
    const text = await extractTextFromPptx(fileBuffer);
    
    // スライド画像の抽出（JSZipを使用）
    const zip = await JSZip.loadAsync(fileBuffer);
    
    // スライドの画像を探す
    const slideFiles: string[] = [];
    Object.keys(zip.files).forEach(filename => {
      if (filename.match(/ppt\/slides\/slide[0-9]+\.xml/)) {
        slideFiles.push(filename);
      }
    });
    
    // スライド番号でソート
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide([0-9]+)\.xml/)?.[1] || '0');
      const numB = parseInt(b.match(/slide([0-9]+)\.xml/)?.[1] || '0');
      return numA - numB;
    });
    
    // 画像ファイルを探す
    const imageFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('ppt/media/') && 
      (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))
    );
    
    // 結果を格納する配列
    const slides: Array<{index: number; text: string; image_path: string}> = [];
    
    // 各スライドの処理
    for (let i = 0; i < slideFiles.length; i++) {
      // スライドのテキスト
      const slideText = text[i] || '';
      
      // 画像ファイルがある場合は使用、なければダミー画像を作成
      let imageBuffer;
      if (i < imageFiles.length) {
        imageBuffer = await zip.files[imageFiles[i]].async('nodebuffer');
      } else {
        // ダミー画像を作成（白い背景に黒いテキスト）
        imageBuffer = await sharp({
          create: {
            width: 800,
            height: 600,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        })
        .png()
        .toBuffer();
      }
      
      // 画像を保存
      const outputPath = path.join(outputDir, `slide_${i + 1}.png`);
      
      await sharp(imageBuffer)
        .png()
        .toFile(outputPath);
      
      // スライド情報を追加
      slides.push({
        index: i,
        text: slideText,
        image_path: outputPath
      });
    }
    
    return { slides };
  } catch (error) {
    console.error('Error parsing PPTX:', error);
    return { error: 'PPTXファイルの解析に失敗しました: ' + (error instanceof Error ? error.message : String(error)) };
  }
} 