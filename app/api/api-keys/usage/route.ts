import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request) {
  // TODO: 認証・権限チェック
  // ここでは全APIキーの使用量をダミーで返す
  const stats = await prisma.usageStatistics.findMany({
    select: {
      userId: true,
      tokenCount: true,
      apiCalls: true,
      month: true,
      year: true,
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 20,
  });
  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' },
  });
} 