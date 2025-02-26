// Node.jsランタイムを明示的に指定
// Anthropic APIの処理を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
// import { verifyToken } from "@/lib/auth/session"; ← 不要なら削除
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Session } from 'next-auth';

interface CustomSession extends Session {
  user: {
    id: string;
    isPremium?: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const getLanguageName = (langCode: string): string => {
  const languages: Record<string, string> = {
    'ja': '日本語',
    'en': '英語',
    // 必要に応じて他の言語を追加
  };
  return languages[langCode] || langCode;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      )
    }

    const data = await req.json()
    
    // リクエストBodyからパラメータ取得
    const { texts, sourceLang, targetLang, model } = data;

    // デフォルトモデルを指定
    const defaultModel = "claude-3-haiku-20240307";
    let selectedModel = model || defaultModel;

    // AWS Bedrockモデルの場合の処理
    if (selectedModel.includes('anthropic.claude')) {
      // TODO: AWS Bedrock APIの呼び出し処理を実装
      return NextResponse.json({ error: "AWS Bedrock APIは現在実装中です" }, { status: 501 });
    }

    // 無料ユーザーは基本モデルのみ利用可能
    if (!session.user?.isPremium) {
      selectedModel = defaultModel;
    }

    console.log("Received translation request:", {
      texts,
      sourceLang,
      targetLang,
      model: selectedModel,
    });

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json({ error: "テキストが必要です" }, { status: 400 });
    }

    const translations = await Promise.all(
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
          messages: [
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        });

        // デバッグ用にログを出力
        console.log("Translation request:", {
          sourceLang,
          targetLang,
          originalText: textObj.text,
          translatedText: (message.content[0] as any).text.trim()
        });
        return (message.content[0] as any).text.trim();
      })
    );

    console.log("All translations completed:", translations);
    return NextResponse.json({ 
      success: true,
      translations,
      metadata: {
        sourceLang,
        targetLang,
        model: selectedModel
      }
    });
  } catch (error) {
    console.error('Translation error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Translation failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      )
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Translation status error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to get translation status' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )
  }
}
