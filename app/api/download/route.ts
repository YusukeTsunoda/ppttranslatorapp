import { NextRequest, NextResponse } from 'next/server';
import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { v4 as uuidv4 } from 'uuid';

// セッション型の定義
interface CustomSession {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
    expires: string;
}

export async function POST(req: NextRequest) {
    try {
        // セッションチェックの強化
        const session = await getServerSession(authOptions) as CustomSession | null;
        
        // セッション状態の詳細なログ
        console.log("セッション状態:", {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
            timestamp: new Date().toISOString()
        });

        // より厳密なセッション検証
        if (!session || !session.user || !session.user.id) {
            console.error("セッション検証失敗:", {
                hasSession: !!session,
                hasUser: !!session?.user,
                hasUserId: !!session?.user?.id,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({ 
                error: 'Unauthorized',
                details: 'セッションが無効です。再度ログインしてください。',
                timestamp: new Date().toISOString()
            }, { status: 401 });
        }

        // リクエストボディを取得
        const body = await req.json();
        const { originalFilePath, slides } = body;

        // リクエストデータの検証
        if (!originalFilePath || !slides || !Array.isArray(slides)) {
            console.error("無効なリクエストデータ:", {
                hasOriginalFilePath: !!originalFilePath,
                hasSlides: !!slides,
                slidesIsArray: Array.isArray(slides),
                userId: session.user.id,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({
                error: 'Invalid request data',
                details: 'リクエストデータが不正です',
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        // ファイルパスの正規化と検証
        const normalizedPath = originalFilePath.replace(/^tmp\/users\/[^/]+/, `tmp/users/${session.user.id}`);
        const fullOriginalPath = path.isAbsolute(normalizedPath)
            ? normalizedPath
            : path.join(process.cwd(), normalizedPath);

        // ファイルパスのデバッグ情報
        console.log("ファイルパス情報:", {
            originalPath: originalFilePath,
            normalizedPath,
            fullPath: fullOriginalPath,
            userId: session.user.id,
            timestamp: new Date().toISOString()
        });

        // ファイルの存在確認
        let fileExists = false;
        try {
            await fs.access(fullOriginalPath);
            fileExists = true;
            console.log("ファイルが存在します:", fullOriginalPath);
        } catch (error) {
            console.error("ファイルアクセスエラー:", {
                error,
                path: fullOriginalPath,
                exists: fileExists,
                userId: session.user.id,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({
                error: 'File not found',
                details: 'ファイルが見つかりません',
                path: fullOriginalPath,
                timestamp: new Date().toISOString()
            }, { status: 404 });
        }

        // 出力ディレクトリの準備
        const userDir = path.join(process.cwd(), 'public', 'uploads', session.user.id);
        await fs.mkdir(userDir, { recursive: true });

        const outputFileName = `translated_${uuidv4()}.pptx`;
        const outputFilePath = path.join(userDir, outputFileName);

        // Pythonスクリプトの実行
        const pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_translator.py');
        const options = {
            mode: 'json' as const,
            pythonPath: 'python3',
            pythonOptions: ['-u'],
            scriptPath: path.dirname(pythonScriptPath),
            args: [
                fullOriginalPath,
                outputFilePath,
                JSON.stringify(slides)
            ]
        };

        // Python処理の実行と結果の取得
        const results = await PythonShell.run(path.basename(pythonScriptPath), options);
        const result = results ? results[results.length - 1] : null;

        // 生成されたファイルの確認
        try {
            await fs.access(outputFilePath);
            console.log("出力ファイルが正常に生成されました:", outputFilePath);
        } catch (error) {
            console.error("出力ファイル生成エラー:", {
                error,
                outputPath: outputFilePath,
                userId: session.user.id,
                timestamp: new Date().toISOString()
            });
            throw new Error('ファイルの生成に失敗しました');
        }

        // 相対パスの生成と返却
        const relativePath = path.join('uploads', session.user.id, outputFileName);
        
        console.log("ダウンロード処理成功:", {
            relativePath,
            outputFilePath,
            userId: session.user.id,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            filePath: relativePath,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("ダウンロードAPI処理エラー:", {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ 
            error: 'Failed to generate translated PPTX',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
} 