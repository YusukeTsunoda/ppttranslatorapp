import { NextRequest, NextResponse } from 'next/server';
import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        // セッションチェック
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // リクエストボディを取得
        const body = await req.json();
        const { originalFilePath, slides } = body;

        console.log("Received download request:", {
            originalFilePath,
            slidesCount: slides?.length,
            body,
            userId: session.user.id
        });

        // バリデーションを強化
        if (!originalFilePath || !slides || !Array.isArray(slides)) {
            return NextResponse.json({ 
                error: 'Missing required fields',
                details: {
                    hasOriginalFilePath: !!originalFilePath,
                    hasSlides: !!slides,
                    slidesIsArray: Array.isArray(slides),
                    originalFilePath,
                    slidesCount: slides?.length
                }
            }, { status: 400 });
        }

        // ユーザーディレクトリの作成
        const userDir = path.join(process.cwd(), 'public', 'uploads', session.user.id);
        await fs.mkdir(userDir, { recursive: true });

        const outputFileName = `translated_${uuidv4()}.pptx`;
        const outputFilePath = path.join(userDir, outputFileName);

        // Pythonスクリプトのパス
        const pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_translator.py');

        // デバッグ情報の出力
        console.log('Debug - Download request:', {
            userId: session.user.id,
            originalFilePath,
            outputFilePath,
            slidesCount: slides.length
        });

        // PythonShellのオプション設定
        const options = {
            mode: 'json' as const,
            pythonPath: 'python3',
            pythonOptions: ['-u'],
            scriptPath: path.dirname(pythonScriptPath),
            args: [
                originalFilePath,
                outputFilePath,
                JSON.stringify(slides)
            ]
        };

        // Pythonスクリプトを実行
        const results = await PythonShell.run(path.basename(pythonScriptPath), options);
        const result = results ? results[results.length - 1] : null;

        // ファイルの存在確認
        await fs.access(outputFilePath);

        // 相対パスを返す
        const relativePath = path.join('uploads', session.user.id, outputFileName);
        
        console.log('Debug - Download success:', {
            relativePath,
            outputFilePath
        });

        return NextResponse.json({ success: true, filePath: relativePath });

    } catch (error) {
        console.error('Error in download API:', error);
        return NextResponse.json({ 
            error: 'Failed to generate translated PPTX',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
} 