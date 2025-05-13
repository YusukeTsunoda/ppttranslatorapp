export async function GET(req: Request) {
  // TODO: ダミー統計データ返却
  return new Response(JSON.stringify({ dailyTranslations: [1,2,3,4,5], creditUsage: [10,20,30,40,50] }), {
    headers: { "Content-Type": "application/json" }
  });
} 