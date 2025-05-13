export async function GET(req: Request) {
  // TODO: APIキー一覧取得のダミー
  return new Response(JSON.stringify([{ id: "dummy", key: "xxxx-xxxx", isActive: true }]), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(req: Request) {
  // TODO: APIキー発行のダミー
  return new Response(JSON.stringify({ id: "dummy", key: "new-key", isActive: true }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function DELETE(req: Request) {
  // TODO: APIキー削除のダミー
  return new Response(null, { status: 204 });
} 