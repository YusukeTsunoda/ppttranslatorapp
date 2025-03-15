import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // URLからクエリパラメータを取得
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // ユーザーIDを取得
    const userId = session.user.id;

    // アクティビティログを取得
    const logs = await prisma.activityLog.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // 総件数を取得
    const total = await prisma.activityLog.count({
      where: {
        userId: userId,
      },
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + logs.length < total,
      },
    });
  } catch (error) {
    console.error("アクティビティログ取得エラー:", error);
    return NextResponse.json(
      { error: "アクティビティログの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
} 