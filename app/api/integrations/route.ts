import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // APIキーが設定されているか確認
    const isConnected = !!process.env.ANTHROPIC_API_KEY;

    // 現在の月と年を取得
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScriptの月は0から始まるため+1
    const currentYear = now.getFullYear();

    // 使用状況データをデータベースから取得
    const usageStats = await prisma.usageStatistics.findUnique({
      where: {
        userId_month_year: {
          userId: session.user.id,
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    // 使用状況データ
    const usageData = {
      tokenCount: usageStats?.tokenCount || 0,
      apiCalls: usageStats?.apiCalls || 0,
    };

    return NextResponse.json({
      anthropic: {
        isConnected,
        apiEndpoint: process.env.NEXT_PUBLIC_ANTHROPIC_API_URL || "https://api.anthropic.com/v1",
      },
      usage: usageData,
    });
  } catch (error) {
    console.error("統合情報取得エラー:", error);
    return NextResponse.json(
      { error: "統合情報の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // APIキーが設定されているか確認
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, message: "Anthropic APIキーが設定されていません" },
        { status: 400 }
      );
    }

    // Anthropic APIの接続テスト
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // 簡単なメッセージを送信してテスト
      await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hello" }],
      });

      return NextResponse.json({
        success: true,
        message: "Anthropic APIとの接続に成功しました",
      });
    } catch (apiError) {
      console.error("Anthropic API接続テストエラー:", apiError);
      return NextResponse.json(
        {
          success: false,
          message: "Anthropic APIとの接続に失敗しました",
          error: (apiError as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("統合情報テストエラー:", error);
    return NextResponse.json(
      { success: false, error: "統合情報のテスト中にエラーが発生しました" },
      { status: 500 }
    );
  }
} 