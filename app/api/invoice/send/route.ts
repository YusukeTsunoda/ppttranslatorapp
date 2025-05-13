export async function POST(req: Request) {
  try {
    const { to, subject, pdfBase64 } = await req.json();
    if (!to || !subject || !pdfBase64) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    // TODO: Resend等のメールAPI呼び出し（ここではダミー）
    // await resend.send({ to, subject, attachments: [{ content: pdfBase64, filename: 'invoice.pdf' }] });
    return new Response(JSON.stringify({ success: true, message: 'メール送信ダミー' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'メール送信失敗', detail: String(e) }), { status: 500 });
  }
} 