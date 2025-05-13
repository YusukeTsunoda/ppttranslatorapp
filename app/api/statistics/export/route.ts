import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request) {
  try {
    const stats = await prisma.usageStatistics.findMany({
      select: {
        userId: true,
        tokenCount: true,
        apiCalls: true,
        month: true,
        year: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 100,
    });
    const csv = [
      'userId,tokenCount,apiCalls,month,year',
      ...stats.map(s => `${s.userId},${s.tokenCount},${s.apiCalls},${s.month},${s.year}`)
    ].join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="statistics.csv"',
      },
    });
  } catch (e) {
    return new Response('CSVエクスポート失敗: ' + String(e), { status: 500 });
  }
} 