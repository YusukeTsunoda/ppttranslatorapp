import { spawn } from 'child_process';
import path from 'path';

export async function parsePptxFile(filePath: string, outputDir: string): Promise<any> {
  try {
    const pythonProcess = spawn('python3', [path.join(process.cwd(), 'scripts', 'parse_pptx.py'), filePath, outputDir]);

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      pythonOutput += output;
      console.log(`Python stdout: ${output}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      pythonError += error;
      // エラーに関連する重要な情報のみをログ出力
      if (error.includes('error') || error.includes('Error') || error.includes('Exception')) {
        console.error(`Python stderr: ${error}`);
      }
    });

    // ... existing code ...

    // 結果の検証を強化
    try {
      const parsedOutput = JSON.parse(pythonOutput);

      // スライドデータの検証
      if (!parsedOutput.slides || !Array.isArray(parsedOutput.slides)) {
        console.error('スライドデータ解析エラー: slides プロパティがないか配列ではありません');
        console.error('Python出力:', pythonOutput.substring(0, 200) + '...'); // 先頭200文字だけ表示
        return { error: 'スライドデータの形式が不正です' };
      }

      if (parsedOutput.slides.length === 0) {
        console.error('スライドデータ解析エラー: スライドが0件です');
        return { error: 'スライドが検出されませんでした' };
      }

      // スライドデータの詳細をログ出力
      console.log(`スライド解析成功: ${parsedOutput.slides.length}件のスライドを検出`);
      console.log(`最初のスライド: ${parsedOutput.slides[0].texts?.length || 0}件のテキスト要素を含む`);

      return parsedOutput;
    } catch (error: any) {
      console.error('JSON解析エラー:', error.message);
      console.error('Python出力の生データ:', pythonOutput.substring(0, 500) + '...'); // 先頭500文字だけ表示
      return { error: 'スライドデータのJSON解析に失敗しました' };
    }
  } catch (error: any) {
    console.error('PPTX解析エラー:', error.message);
    return { error: 'PPTXファイルの解析中にエラーが発生しました' };
  }
}
