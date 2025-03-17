import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { UserRole } from '@prisma/client';

// 月ごとの翻訳数を集計する関数
async function getMonthlyTranslations() {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  
  // 過去6ヶ月分のデータを取得
  const translations = await prisma.translationHistory.findMany({
    where: {
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    select: {
      createdAt: true,
      creditsUsed: true
    }
  });
  
  // 月ごとに集計
  const monthlyData: Record<string, { count: number, credits: number }> = {};
  
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(now.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = { count: 0, credits: 0 };
  }
  
  translations.forEach(translation => {
    const date = new Date(translation.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].credits += translation.creditsUsed;
    }
  });
  
  // 表示用に整形
  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      count: data.count,
      credits: data.credits
    }));
}

// 言語ごとの翻訳数を集計する関数
async function getLanguageStats() {
  const translations = await prisma.translationHistory.findMany({
    select: {
      sourceLang: true,
      targetLang: true,
      creditsUsed: true
    }
  });
  
  const sourceStats: Record<string, { count: number, credits: number }> = {};
  const targetStats: Record<string, { count: number, credits: number }> = {};
  
  translations.forEach(translation => {
    // ソース言語の集計
    if (!sourceStats[translation.sourceLang]) {
      sourceStats[translation.sourceLang] = { count: 0, credits: 0 };
    }
    sourceStats[translation.sourceLang].count += 1;
    sourceStats[translation.sourceLang].credits += translation.creditsUsed;
    
    // ターゲット言語の集計
    if (!targetStats[translation.targetLang]) {
      targetStats[translation.targetLang] = { count: 0, credits: 0 };
    }
    targetStats[translation.targetLang].count += 1;
    targetStats[translation.targetLang].credits += translation.creditsUsed;
  });
  
  return {
    sourceLanguages: Object.entries(sourceStats).map(([lang, data]) => ({
      language: lang,
      count: data.count,
      credits: data.credits
    })),
    targetLanguages: Object.entries(targetStats).map(([lang, data]) => ({
      language: lang,
      count: data.count,
      credits: data.credits
    }))
  };
}

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/signin');
  }
  
  // 管理者権限チェック
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });
  
  if (!user || user.role !== UserRole.ADMIN) {
    redirect('/dashboard');
  }
  
  // 統計データを取得
  const monthlyTranslations = await getMonthlyTranslations();
  const languageStats = await getLanguageStats();
  
  // 総計を計算
  const totalTranslations = await prisma.translationHistory.count();
  const totalCreditsUsed = await prisma.translationHistory.aggregate({
    _sum: {
      creditsUsed: true
    }
  });
  
  // アクティブユーザー数
  const activeUsers = await prisma.user.count({
    where: {
      TranslationHistory: {
        some: {
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        }
      }
    }
  });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">統計・分析</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← 管理者ダッシュボードに戻る
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>総翻訳数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalTranslations}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>総消費クレジット</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalCreditsUsed._sum.creditsUsed || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>アクティブユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{activeUsers}</p>
            <p className="text-sm text-gray-500">過去30日間</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="monthly" className="mb-8">
        <TabsList>
          <TabsTrigger value="monthly">月別統計</TabsTrigger>
          <TabsTrigger value="language">言語別統計</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>月別翻訳数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2">月</th>
                      <th className="text-right p-2">翻訳数</th>
                      <th className="text-right p-2">消費クレジット</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTranslations.map((item) => (
                      <tr key={item.month} className="border-t">
                        <td className="p-2">{item.month}</td>
                        <td className="text-right p-2">{item.count}</td>
                        <td className="text-right p-2">{item.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="language">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ソース言語</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2">言語</th>
                        <th className="text-right p-2">翻訳数</th>
                        <th className="text-right p-2">消費クレジット</th>
                      </tr>
                    </thead>
                    <tbody>
                      {languageStats.sourceLanguages.map((item) => (
                        <tr key={item.language} className="border-t">
                          <td className="p-2">{item.language}</td>
                          <td className="text-right p-2">{item.count}</td>
                          <td className="text-right p-2">{item.credits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>ターゲット言語</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2">言語</th>
                        <th className="text-right p-2">翻訳数</th>
                        <th className="text-right p-2">消費クレジット</th>
                      </tr>
                    </thead>
                    <tbody>
                      {languageStats.targetLanguages.map((item) => (
                        <tr key={item.language} className="border-t">
                          <td className="p-2">{item.language}</td>
                          <td className="text-right p-2">{item.count}</td>
                          <td className="text-right p-2">{item.credits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 