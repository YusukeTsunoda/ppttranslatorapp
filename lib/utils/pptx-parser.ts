import * as fs from 'fs/promises';
import * as path from 'path';
import { extractRawText } from 'pptx-parser';
import sharp from 'sharp';
import JSZip from 'jszip';

export async function parsePptx(filePath: string, outputDir: string) {
  try {
    // PPTXファイルを読み込む
    const fileBuffer = await fs.readFile(filePath);
    
    // テキスト抽出
    const text = await extractRawText(fileBuffer);
    
    // スライド画像の抽出（JSZipを使用）
    const zip = await JSZip.loadAsync(fileBuffer);
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('ppt/media/') && 
      (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))
    );
    
    // 結果を格納する配列
    const slides: Array<{index: number; text: string; image_path: string}> = [];
    
    // 各スライドの処理
    for (let i = 0; i < slideFiles.length; i++) {
      const fileName = slideFiles[i];
      const content = await zip.files[fileName].async('nodebuffer');
      
      // 画像を保存
      const outputPath = path.join(outputDir, `slide_${i + 1}.png`);
      
      // 必要に応じて画像を変換（例：JPGからPNGへ）
      await sharp(content)
        .png()
        .toFile(outputPath);
      
      // スライド情報を追加
      slides.push({
        index: i,
        text: text[i] || '',
        image_path: outputPath
      });
    }
    
    return { slides };
  } catch (error) {
    console.error('Error parsing PPTX:', error);
    return { error: 'PPTXファイルの解析に失敗しました' };
  }
} 