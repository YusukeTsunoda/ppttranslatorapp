import { NextRequest, NextResponse } from 'next/server';
import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { v4 as uuidv4 } from 'uuid';
import { createFilePath, getAbsolutePath, ensureFilePath, logFileOperation } from '@/lib/utils/file-utils';

// セッション型の定義
interface CustomSession {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
    expires: string;
}

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyAndGetFile(filePath: string, userId: string, fileId: string): Promise<Buffer> {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            await fs.access(filePath);
            await logFileOperation(userId, 'access', fileId, true);
            return await fs.readFile(filePath);
        } catch (error) {
            retries++;
            if (retries === MAX_RETRIES) {
                if (error instanceof Error) {
                    await logFileOperation(userId, 'access', fileId, false, error.message);
                }
                throw error;
            }
            await wait(RETRY_DELAY * retries);
        }
    }
    throw new Error('Maximum retries exceeded');
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
        const fileId = path.basename(originalFilePath).split('_')[0];
        const outputFileName = `translated_${fileId}.pptx`;
        const userDir = path.join('public', 'uploads', session.user.id);
        const outputFilePath = path.join(userDir, outputFileName);
        const fullOutputPath = getAbsolutePath(outputFilePath);

        // 出力ディレクトリの準備
        await ensureFilePath(userDir);

        // Pythonスクリプトの実行
        const pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_translator.py');
        const options = {
            mode: 'json' as const,
            pythonPath: 'python3',
            pythonOptions: ['-u'],
            scriptPath: path.dirname(pythonScriptPath),
            args: [
                getAbsolutePath(originalFilePath),
                fullOutputPath,
                JSON.stringify(slides)
            ]
        };

        // Python処理の実行と結果の取得
        const results = await PythonShell.run(path.basename(pythonScriptPath), options);
        const result = results ? results[results.length - 1] : null;

        // 生成されたファイルの確認とリトライ処理
        try {
            await verifyAndGetFile(fullOutputPath, session.user.id, fileId);
            console.log("出力ファイルが正常に生成されました:", fullOutputPath);
        } catch (error) {
            console.error("出力ファイル生成エラー:", {
                error,
                outputPath: fullOutputPath,
                userId: session.user.id,
                timestamp: new Date().toISOString()
            });
            if (error instanceof Error) {
                await logFileOperation(session.user.id, 'create', fileId, false, error.message);
            }
            throw new Error('ファイルの生成に失敗しました');
        }

        // 相対パスの生成と返却
        const relativePath = path.join('uploads', session.user.id, outputFileName);
        
        console.log("ダウンロード処理成功:", {
            relativePath,
            outputFilePath: fullOutputPath,
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