import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
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

// スライドをPNG画像として生成する関数
async function generateSlideImage(slideNumber: number, slideText: string): Promise<Buffer> {
  // テキストをエスケープ
  const escapedText = slideText
    .substring(0, 300)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  // テキストを複数行に分割
  const lines: string[] = [];
  let currentLine = '';
  const words = escapedText.split(' ');
  
  for (const word of words) {
    if ((currentLine + ' ' + word).length > 40) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // SVGを生成
  const textElements = lines.map((line, index) => 
    `<text x="50" y="${120 + index * 30}" font-family="Arial" font-size="18" fill="black">${line}</text>`
  ).join('\n');
  
  const svgContent = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="10" y="10" width="780" height="580" fill="white" stroke="gray" stroke-width="1"/>
      <text x="50" y="50" font-family="Arial" font-size="24" font-weight="bold" fill="black">スライド ${slideNumber}</text>
      <line x1="50" y1="70" x2="750" y2="70" stroke="gray" stroke-width="1"/>
      ${textElements}
    </svg>
  `;
  
  // SVGをPNGに変換
  return await sharp(Buffer.from(svgContent))
    .png()
    .toBuffer();
}

// スライドの背景画像を抽出する関数
async function extractSlideBackground(zip: JSZip, slideXml: string, slideNumber: number): Promise<Buffer | undefined> {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
    
    // 背景の画像参照を探す (p:bg 要素内の a:blip)
    const bgElements = xmlDoc.getElementsByTagName('p:bg');
    if (bgElements.length > 0) {
      const blipElements = bgElements[0].getElementsByTagName('a:blip');
      if (blipElements.length > 0) {
        const embed = blipElements[0].getAttribute('r:embed');
        if (embed) {
          // 関係ファイルからメディアファイルを取得
          const slideNum = slideNumber.toString();
          const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
          const relsXml = await zip.file(relsFile)?.async('text');
          
          if (relsXml) {
            const relsDoc = parser.parseFromString(relsXml, 'text/xml');
            const relationships = relsDoc.getElementsByTagName('Relationship');
            
            for (let i = 0; i < relationships.length; i++) {
              if (relationships[i].getAttribute('Id') === embed) {
                const target = relationships[i].getAttribute('Target');
                if (target) {
                  // メディアファイルのパスを構築
                  let mediaPath = '';
                  if (target.startsWith('/')) {
                    mediaPath = target.substring(1);
                  } else if (target.startsWith('../')) {
                    mediaPath = 'ppt/' + target.substring(3);
                  } else {
                    mediaPath = 'ppt/slides/' + target;
                  }
                  
                  console.log(`Found background image: ${mediaPath} for slide ${slideNumber}`);
                  
                  // 画像ファイルを取得
                  const mediaFile = zip.file(mediaPath);
                  if (mediaFile) {
                    return await mediaFile.async('nodebuffer');
                  }
                }
              }
            }
          }
        }
      }
    }
    return undefined;
  } catch (err) {
    console.error(`Error extracting background from slide ${slideNumber}:`, err);
    return undefined;
  }
}

// スライド内のすべての画像を抽出する関数
async function extractAllSlideImages(zip: JSZip, slideXml: string, slideNumber: number): Promise<Buffer[]> {
  const images: Buffer[] = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
    
    // すべての画像参照を探す (a:blip要素)
    const blipElements = xmlDoc.getElementsByTagName('a:blip');
    console.log(`Found ${blipElements.length} image references in slide ${slideNumber}`);
    
    if (blipElements.length > 0) {
      // 関係ファイルのパスを取得
      const relsFile = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const relsXml = await zip.file(relsFile)?.async('text');
      
      if (relsXml) {
        const relsDoc = parser.parseFromString(relsXml, 'text/xml');
        const relationships = relsDoc.getElementsByTagName('Relationship');
        
        // 各画像参照を処理
        for (let j = 0; j < blipElements.length; j++) {
          const embed = blipElements[j].getAttribute('r:embed');
          if (embed) {
            // 対応するリレーションシップを探す
            for (let k = 0; k < relationships.length; k++) {
              if (relationships[k].getAttribute('Id') === embed) {
                const target = relationships[k].getAttribute('Target');
                if (target) {
                  // メディアファイルのパスを構築
                  let mediaPath = '';
                  if (target.startsWith('/')) {
                    mediaPath = target.substring(1);
                  } else if (target.startsWith('../')) {
                    mediaPath = 'ppt/' + target.substring(3);
                  } else {
                    mediaPath = 'ppt/slides/' + target;
                  }
                  
                  console.log(`Found image reference: ${mediaPath} for slide ${slideNumber}`);
                  
                  // 画像ファイルを取得
                  const mediaFile = zip.file(mediaPath);
                  if (mediaFile) {
                    const imageBuffer = await mediaFile.async('nodebuffer');
                    images.push(imageBuffer);
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error extracting images from slide ${slideNumber}:`, err);
  }
  return images;
}

// スライドのスクリーンショットを生成する関数
async function createSlideScreenshot(
  slideNumber: number, 
  slideText: string, 
  backgroundImage?: Buffer, 
  slideImages: Buffer[] = []
): Promise<Buffer> {
  try {
    // 背景画像がある場合はそれを使用
    if (backgroundImage) {
      // 背景画像をリサイズして返す
      return await sharp(backgroundImage)
        .resize(800, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer();
    }
    
    // スライド内の画像がある場合は最初の画像を使用
    if (slideImages.length > 0) {
      // 最初の画像をリサイズして返す
      return await sharp(slideImages[0])
        .resize(800, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer();
    }
    
    // 画像がない場合はテキストベースの画像を生成
    return await generateSlideImage(slideNumber, slideText);
  } catch (err) {
    console.error(`Error creating slide screenshot for slide ${slideNumber}:`, err);
    // エラーが発生した場合はテキストベースの画像を生成
    return await generateSlideImage(slideNumber, slideText);
  }
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
    const mediaFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('ppt/media/')
    );
    
    console.log(`Found ${mediaFiles.length} media files in PPTX`);
    
    // 結果を格納する配列
    const slides: Array<{index: number; text: string; image_path: string}> = [];
    
    // 各スライドの処理
    for (let i = 0; i < slideFiles.length; i++) {
      // スライドのテキスト
      const slideText = text[i] || '';
      const slideNumber = i + 1;
      
      console.log(`Processing slide ${slideNumber}: ${slideText.substring(0, 30)}...`);
      
      // スライドのXMLを取得
      const slideXml = await zip.file(slideFiles[i])?.async('text');
      let imageBuffer: Buffer | undefined = undefined;
      
      if (slideXml) {
        // スライドの背景画像を抽出
        const backgroundImage = await extractSlideBackground(zip, slideXml, slideNumber);
        
        // スライド内のすべての画像を抽出
        const slideImages = await extractAllSlideImages(zip, slideXml, slideNumber);
        
        // スライドのスクリーンショットを生成
        imageBuffer = await createSlideScreenshot(slideNumber, slideText, backgroundImage, slideImages);
      }
      
      // 画像が見つからなかった場合はダミー画像を生成
      if (!imageBuffer) {
        console.log(`Generating image for slide ${slideNumber}`);
        imageBuffer = await generateSlideImage(slideNumber, slideText);
      }
      
      // 画像を保存
      const outputPath = path.join(outputDir, `slide_${slideNumber}.png`);
      
      // ディレクトリが存在しない場合は作成
      if (!existsSync(outputDir)) {
        console.log(`Creating directory: ${outputDir}`);
        mkdirSync(outputDir, { recursive: true });
      }
      
      // デバッグ情報を追加
      console.log('Saving image to:', {
        outputDir,
        outputPath,
        exists: existsSync(path.dirname(outputPath))
      });
      
      await sharp(imageBuffer)
        .png()
        .toFile(outputPath);
      
      // スライド情報を追加
      slides.push({
        index: i,
        text: slideText,
        image_path: `slide_${slideNumber}.png`
      });
    }
    
    return { slides };
  } catch (error) {
    console.error('Error parsing PPTX:', error);
    return { error: 'PPTXファイルの解析に失敗しました: ' + (error instanceof Error ? error.message : String(error)) };
  }
} 