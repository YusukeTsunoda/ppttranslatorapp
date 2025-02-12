import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from "@/lib/auth/session";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    // セッションチェック
    const sessionCookie = req.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await verifyToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // リクエストボディを取得
    const body = await req.json();
    const { fileId, translations } = body;

    if (!fileId || !translations) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // ユーザーIDを取得
    const userId = session.user.id.toString();

    // ディレクトリパスを設定
    const userDir = path.join(process.cwd(), 'tmp', 'users', userId);
    const uploadsDir = path.join(userDir, 'uploads');
    
    // デバッグ用のログ出力
    console.log('Debug info:', {
      userDir,
      uploadsDir,
      fileId,
      exists: {
        userDir: await fs.access(userDir).then(() => true).catch(() => false),
        uploadsDir: await fs.access(uploadsDir).then(() => true).catch(() => false)
      }
    });
    
    // アップロードされたファイル名を使用
    const files = await fs.readdir(uploadsDir);
    console.log('Available files:', files);
    
    const originalFile = files.find(file => file.startsWith(`${fileId}_`) && file.endsWith('.pptx'));
    console.log('Found original file:', originalFile);
    
    if (!originalFile) {
      throw new Error('Original PPTX file not found');
    }
    const originalPptxPath = path.join(uploadsDir, originalFile);
    const translationsJsonPath = path.join(uploadsDir, `${fileId}_translations.json`);
    const outputPath = path.join(uploadsDir, `${fileId}_translated.pptx`);

    // ディレクトリの存在確認と作成
    await fs.mkdir(uploadsDir, { recursive: true });

    // ファイルの存在確認
    try {
      await fs.access(originalPptxPath);
      console.log('Found original PPTX at:', originalPptxPath);
    } catch (error) {
      console.error('Original PPTX not found:', originalPptxPath);
      try {
        const files = await fs.readdir(uploadsDir);
        console.log('Available files in uploads directory:', files);
      } catch (e) {
        console.error('Failed to read uploads directory:', e);
      }
      return NextResponse.json(
        { error: 'Original PPTX file not found' },
        { status: 404 }
      );
    }

    // 翻訳データをJSONファイルとして保存
    await fs.writeFile(translationsJsonPath, JSON.stringify(translations));

    try {
      // Python スクリプトを実行
      const pythonScript = path.join(process.cwd(), 'lib', 'python', 'pptx_generator.py');

      // スクリプトの存在確認
      try {
        await fs.access(pythonScript);
      } catch {
        console.error('Python script not found:', pythonScript);
        return NextResponse.json({ error: 'Python script not found' }, { status: 500 });
      }

      // スクリプトの実行権限を確認
      try {
        await fs.access(pythonScript, fs.constants.X_OK);
      } catch (err) {
        console.error('Python script is not executable:', err instanceof Error ? err.message : String(err));
        return NextResponse.json({ error: 'Python script is not executable' }, { status: 500 });
      }

      // アップロードディレクトリの作成
      const uploadDir = path.join(process.cwd(), 'tmp', 'users', userId, 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      // Pythonスクリプトの実行（既に確認済みのoriginalPptxPathを使用）
      console.log('Executing Python script with paths:', {
        pythonScript,
        originalPptxPath,
        translationsJsonPath,
        outputPath
      });

      // 翻訳データの内容をログ出力
      console.log('Translation data:', JSON.stringify(translations, null, 2));
      console.log('Sample translation from first slide:', translations[0]?.texts?.[0]);

      const { stdout, stderr } = await execAsync(
        `python3 "${pythonScript}" "${originalPptxPath}" "${translationsJsonPath}" "${outputPath}"`
      );
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
      if (stdout) {
        console.log('Python script stdout:', stdout);
        try {
          const result = JSON.parse(stdout);
          if (!result.success) {
            console.error('Python script error:', result.error);
            return NextResponse.json({ error: `Failed to generate PPTX: ${result.error}` }, { status: 500 });
          }
        } catch (e) {
          console.error('Failed to parse Python script output:', stdout);
        }
      }

      // 生成されたファイルの存在確認
      try {
        await fs.access(outputPath);
      } catch {
        console.error('Generated PPTX file not found:', outputPath);
        return NextResponse.json({ error: 'Generated PPTX file not found' }, { status: 500 });
      }

      // 一時ファイルを削除
      await fs.unlink(translationsJsonPath).catch(console.error);

      // 成功レスポンスを返す
      return NextResponse.json({
        success: true,
        downloadUrl: `/api/download/${userId}/${fileId}_translated.pptx`
      });

    } catch (error) {
      console.error('Error executing Python script:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Failed to generate PPTX: ' + (error instanceof Error ? error.message : String(error)) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating PPTX:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to generate PPTX' },
      { status: 500 }
    );
  }
}
