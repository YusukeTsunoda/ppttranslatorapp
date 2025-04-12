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

// APIキーの設定状況をログ出力
console.log('API Key set:', !!process.env.ANTHROPIC_API_KEY);
console.log(
  'API Key prefix:',
  process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'Not set',
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as CustomSession;
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    const data = await req.json();

    // リクエストBodyからパラメータ取得
    const { texts, sourceLang, targetLang, model, fileName = 'スライド', slides, fileId } = data;

    // ★★★ Check if fileId is provided ★★★
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
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

    console.log('Received translation request:', {
      texts,
      sourceLang,
      targetLang,
      model: selectedModel,
    });

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json({ error: 'テキストが必要です' }, { status: 400 });
    }

    let translations: string[] = [];
    let translationError: Error | null = null;
    const startTime = performance.now(); // Start time measurement

    try {
      translations = await Promise.all(
        texts.map(async (textObj) => {
          const prompt = `
あなたはプレゼンテーション資料の専門翻訳者です。
以下のテキストを${getLanguageName(sourceLang)}から${getLanguageName(targetLang)}に翻訳してください。

翻訳の要件：
1. 原文の構造（見出し、箇条書きなど）を維持すること
2. 原文のニュアンスと意味を正確に伝えること
3. 専門用語や固有名詞は適切に処理すること
4. ${getLanguageName(targetLang)}として自然な表現を使用すること

原文:
${textObj.text}

翻訳文のみを出力してください。説明や注釈は含めないでください。
`;

          const message = await anthropic.messages.create({
            model: selectedModel,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          });

          // ★★★ Remove debug log? Consider logging strategy ★★★
          // console.log('Translation request:', {
          //   sourceLang,
          //   targetLang,
          //   originalText: textObj.text,
          //   translatedText: (message.content[0] as any).text.trim(),
          // });
          return (message.content[0] as any).text.trim();
        }),
      );
      console.log('All translations completed successfully.');
    } catch (error) {
      console.error('Anthropic API Error:', error);
      translationError = error instanceof Error ? error : new Error(String(error));
      // If translation fails, we might still want to record history, but with FAILED status
    }

    const endTime = performance.now();
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
        console.log('クレジット消費が完了しました');
      }

      const createdHistory = await prisma.translationHistory.create({
        data: historyData,
      });

      console.log('作成された翻訳履歴:', createdHistory);
      console.log('履歴記録が完了しました');

    } catch (dbError) {
      console.error('データベース操作エラー (クレジット更新 or 履歴作成):', dbError);
      // Even if DB fails, try to return the translation result if available
    }
    // --- End History and Credit Logic ---

    // If translation itself failed, return error
    if (translationError) {
        return new NextResponse(JSON.stringify({ error: 'Translation failed', detail: translationError.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    }

    // Return successful translation
    console.log('Returning successful translation response.');
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
    return new NextResponse(JSON.stringify({ error: 'Translation failed', detail: error instanceof Error ? error.message : String(error) }), {
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
