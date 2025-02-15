// Node.jsランタイムを明示的に指定
// Anthropic APIの処理を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/session";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  // セッションチェックとセッション取得
  const sessionCookie = request.cookies.get("session");
  if (!sessionCookie) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  let session: any;
  try {
    session = await verifyToken(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: "認証が無効です" }, { status: 401 });
  }

  // リクエストBodyからパラメータ取得
  const body = await request.json();
  const { texts, sourceLang, targetLang, model } = body;

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
以下のテキストを${sourceLang}から${targetLang}に翻訳してください。

翻訳の要件：
1. 原文の構造（見出し、箇条書きなど）を維持すること
2. 原文のニュアンスと意味を正確に伝えること
3. 専門用語や固有名詞は適切に処理すること

原文 (${sourceLang}):
${textObj.text}

翻訳文は${targetLang}で提供してください。
必ず翻訳文のみを出力し、説明や注釈は含めないでください。
`;

      const message = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 1024,
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });

      console.log("Translation result:", (message.content[0] as any).text);
      return (message.content[0] as any).text;
    })
  );

  console.log("All translations completed:", translations);
  return NextResponse.json({ translations });
}
