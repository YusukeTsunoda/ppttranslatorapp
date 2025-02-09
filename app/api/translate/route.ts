import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function translateText(text: string, targetLang: string) {
  // Claude APIを使用して翻訳を実行
  // TODO: 実際のClaude API実装を追加
  return text; // 仮の実装
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { filePath, slideIndex, texts, targetLang } = body;

    if (!filePath || !Array.isArray(texts) || !targetLang) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    // 各テキストを翻訳
    const translatedTexts = await Promise.all(
      texts.map(async (text) => {
        const translatedText = await translateText(text.text, targetLang);
        return {
          ...text,
          translated_text: translatedText,
        };
      })
    );

    // 翻訳結果をPPTXに適用
    const pythonScript = join(process.cwd(), "lib/python/pptx_parser.py");
    const outputPath = filePath.replace(".pptx", "_translated.pptx");
    const translations = {
      [slideIndex]: translatedTexts,
    };

    const { stderr } = await execAsync(
      `python ${pythonScript} ${filePath} ${outputPath} '${JSON.stringify(
        translations
      )}'`
    );

    if (stderr) {
      console.error("Python script error:", stderr);
      return NextResponse.json(
        { error: "翻訳の適用に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      translations: translatedTexts,
      outputPath,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "翻訳処理に失敗しました" },
      { status: 500 }
    );
  }
}
