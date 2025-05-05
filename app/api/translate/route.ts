// Node.jsランタイムを明示的に指定
// Anthropic APIの処理を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Session } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { v4 as uuidv4 } from 'uuid';
import { Language, TranslationStatus } from '@prisma/client';

interface CustomSession extends Session {
  user: {
    id: string;
    isPremium?: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// 翻訳APIエンドポイント
export async function POST(request: Request) {
  try {
    // APIキーの確認
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API設定が不足しています' },
        { status: 500 }
      );
    }

    // APIクライアントの設定
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // セッションからユーザー情報を取得
    const session = (await getServerSession(authOptions)) as CustomSession;
    if (!session) {
      return new NextResponse(JSON.stringify({ error: '認証が必要です' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    const data = await request.json();

    // リクエストBodyからパラメータ取得
    const { texts, sourceLang, targetLang, model, fileName = 'スライド', slides, fileId } = data;

    // ★★★ Check if fileId is provided ★★★
    if (!fileId) {
      return NextResponse.json({ error: 'ファイルIDが必要です' }, { status: 400 });
    }

    // デフォルトモデルを指定
    const defaultModel = 'claude-3-haiku-20240307';
    let selectedModel = model || defaultModel;

    // AWS Bedrockモデルの場合の処理
    if (selectedModel.includes('anthropic.claude')) {
      // TODO: AWS Bedrock APIの呼び出し処理を実装
      return NextResponse.json({ error: 'AWS Bedrock APIは現在実装中です' }, { status: 501 });
    }

    // 無料ユーザーは基本モデルのみ利用可能
    if (!session.user?.isPremium) {
      selectedModel = defaultModel;
    }

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json({ error: 'テキストが必要です' }, { status: 400 });
    }

    let translations: string[] = [];
    let translationError: Error | null = null;
    const startTime = Date.now(); // Start time measurement

    try {
      // 翻訳処理の実行
      let translationIndex = 0;
      const totalTextCount = slides.reduce((count: number, slide: any) => count + slide.textElements.length, 0);
      const startTime = Date.now();
      let translationError: Error | null = null;

      // 翻訳プロミスの作成
      const translationPromises = slides.flatMap((slide: any) =>
        slide.textElements.map((element: any) => {
          if (!element.text || element.text.trim() === '') {
            return Promise.resolve('');
          }

          // 翻訳プロンプトの作成
          const prompt = `あなたは高品質な翻訳エンジンです。以下のテキストを${sourceLang}から${targetLang}に翻訳してください。
元のテキストの意味を正確に保ちながら、自然な${targetLang}に翻訳してください。
フォーマットや記号は保持し、翻訳のみを行ってください。

テキスト: "${element.text}"

翻訳:`;

          // Anthropic APIを使用した翻訳
          return anthropic.messages.create({
            model: selectedModel,
            max_tokens: 1000,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }).then(message => {
            return (message.content[0] as any).text.trim();
          }).catch(error => {
            // エラーログは残す
            console.error('翻訳APIエラー:', error instanceof Error ? error.message : String(error));
            return `[翻訳エラー]`;
          });
        })
      );

      // 翻訳結果の取得
      translations = await Promise.all(translationPromises);

    } catch (error) {
      console.error('翻訳APIエラー:', error instanceof Error ? error.message : String(error));
      translationError = error instanceof Error ? error : new Error(String(error));
    }

    const endTime = Date.now();
    const processingTime = Math.round(endTime - startTime); // Calculate processing time in milliseconds

    // --- History and Credit Logic ---
    let historyStatus: TranslationStatus;
    let historyErrorMessage: string | null = null;

    if (translationError) {
      historyStatus = TranslationStatus.FAILED;
      historyErrorMessage = translationError.message;
    } else {
      historyStatus = TranslationStatus.COMPLETED;
    }

    // Prepare history data regardless of DB operation success
    const historyData = {
      // id: uuidv4(), // Let Prisma handle default cuid()
      userId: session.user.id,
      fileId: fileId, // Use provided fileId
      // fileName: fileName, // Removed, get from File model if needed
      pageCount: slides?.length ?? 0, // Use provided slides array or default to 0
      status: historyStatus,
      creditsUsed: historyStatus === TranslationStatus.COMPLETED ? 1 : 0, // Only consume credit on success
      sourceLang: sourceLang as Language,
      targetLang: targetLang as Language,
      model: selectedModel,
      // fileSize: 0, // TODO: Get file size if needed, maybe from File record?
      processingTime: processingTime, // Store calculated processing time
      translatedFileKey: null, // Set later when file is generated and stored
      errorMessage: historyErrorMessage,
    };

    // Attempt to update credits (only on success) and create history record
    try {
      if (historyStatus === TranslationStatus.COMPLETED) {
        // Decrement credit only if translation was successful
        await prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { decrement: 1 } },
        });
      }

      const createdHistory = await prisma.translationHistory.create({
        data: historyData,
      });

    } catch (dbError) {
      console.error('データベース操作エラー (クレジット更新 or 履歴作成):', dbError);
      // Even if DB fails, try to return the translation result if available
    }
    // --- End History and Credit Logic ---

    // If translation itself failed, return error
    if (translationError) {
        return new NextResponse(JSON.stringify({ error: '翻訳に失敗しました', detail: translationError.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    }

    // Return successful translation
    return NextResponse.json({
      success: true,
      translations,
      metadata: {
        sourceLang,
        targetLang,
        model: selectedModel,
      },
    });
  } catch (error) {
    console.error('Overall Translation API Error:', error);
    // Attempt to record a FAILED history entry even in outer catch block?
    // This might be complex due to potential lack of data (session, fileId etc.)
    // For now, just return a generic error.
    return new NextResponse(JSON.stringify({ error: '翻訳に失敗しました', detail: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Translation status error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to get translation status' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

const getLanguageName = (langCode: string): string => {
  const languages: Record<string, string> = {
    ja: '日本語',
    en: '英語',
    zh: '中国語',
    ko: '韓国語',
    fr: 'フランス語',
    de: 'ドイツ語',
    es: 'スペイン語',
    it: 'イタリア語',
    ru: 'ロシア語',
    pt: 'ポルトガル語',
    // 必要に応じて他の言語を追加
  };
  return languages[langCode] || langCode;
};
