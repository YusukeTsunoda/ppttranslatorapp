import { NextRequest, NextResponse } from 'next/server';
import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { v4 as uuidv4 } from 'uuid';
import { 
  filePathManager, 
  logFileOperation, 
  withRetry,
  FILE_CONFIG
} from '@/lib/utils/file-utils';

// セッション型の定義
interface CustomSession {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
    expires: string;
}

// ファイル検証と取得
async function verifyAndGetFile(filePath: string, userId: string, fileId: string): Promise<Buffer> {
    return withRetry(
        async () => {
            await fs.access(filePath);
            await logFileOperation(userId, 'access', fileId, true);
            return await fs.readFile(filePath);
        },
        {
            maxRetries: FILE_CONFIG.maxRetries,
            delay: FILE_CONFIG.retryDelay,
            onError: async (error, attempt) => {
                console.log(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === FILE_CONFIG.maxRetries) {
                    if (error instanceof Error) {
                        await logFileOperation(userId, 'access', fileId, false, error.message);
                    }
                }
            }
        }
    );
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
        const { fileId, slides } = body;

        // リクエストデータの検証
        if (!fileId || !slides || !Array.isArray(slides)) {
            console.error("無効なリクエストデータ:", {
                hasFileId: !!fileId,
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

        // fileIdから元のファイルパスを構築
        const originalFilePath = filePathManager.getTempPath(session.user.id, fileId, 'original');
        
        // 元のファイルパスと出力ファイルパスの生成
        const originalFullPath = filePathManager.getAbsolutePath(originalFilePath);
        const translatedFileName = `${fileId}_translated.pptx`;
        
        // 実際のファイルパスを検索 - 修正部分
        const actualOriginalFilePath = await filePathManager.findActualFilePath(session.user.id, fileId, 'original');
        if (!actualOriginalFilePath) {
            console.error("元のファイルが見つかりません:", {
                fileId,
                userId: session.user.id,
                searchPath: originalFullPath,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({ 
                error: 'Original file not found',
                details: '元のファイルが見つかりません。再度アップロードしてください。',
                timestamp: new Date().toISOString()
            }, { status: 404 });
        }
        
        const tempTranslatedPath = filePathManager.getTempPath(session.user.id, fileId, 'translated');
        const tempTranslatedFullPath = filePathManager.getAbsolutePath(tempTranslatedPath);
        
        // 出力ディレクトリの準備
        await filePathManager.ensurePath(tempTranslatedPath);

        // ファイルパスのデバッグ情報
        console.log("ファイルパス情報:", {
            originalPath: originalFilePath,
            actualOriginalFilePath, // 実際のファイルパスをログ出力
            tempTranslatedPath,
            tempTranslatedFullPath,
            userId: session.user.id,
            timestamp: new Date().toISOString()
        });

        // Pythonスクリプトの実行
        const pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_translator.py');
        const options = {
            mode: 'json' as const,
            pythonPath: 'python3',
            pythonOptions: ['-u'],
            scriptPath: path.dirname(pythonScriptPath),
            args: [
                actualOriginalFilePath, // 実際のファイルパスを使用
                tempTranslatedFullPath,
                JSON.stringify(slides)
            ]
        };

        // Python処理の実行と結果の取得
        const results = await PythonShell.run(path.basename(pythonScriptPath), options);
        const result = results ? results[results.length - 1] : null;

        // 生成されたファイルの確認とリトライ処理
        try {
            await verifyAndGetFile(tempTranslatedFullPath, session.user.id, fileId);
            console.log("翻訳ファイルが正常に生成されました:", tempTranslatedFullPath);
            
            // 一時ファイルを公開ディレクトリに移動
            const publicPath = await filePathManager.moveToPublic(session.user.id, fileId, 'translated');
            const publicFullPath = filePathManager.getAbsolutePath(publicPath);
            
            console.log("ファイルを公開ディレクトリに移動しました:", {
                from: tempTranslatedFullPath,
                to: publicFullPath
            });
            
            // 相対パスの生成と返却
            const relativePath = publicPath;
            
            console.log("ダウンロード処理成功:", {
                relativePath,
                publicFullPath,
                userId: session.user.id,
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({
                success: true,
                filePath: relativePath,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("ファイル生成・移動エラー:", {
                error,
                tempPath: tempTranslatedFullPath,
                userId: session.user.id,
                timestamp: new Date().toISOString()
            });
            if (error instanceof Error) {
                await logFileOperation(session.user.id, 'create', fileId, false, error.message);
            }
            throw new Error('ファイルの生成または移動に失敗しました');
        }

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