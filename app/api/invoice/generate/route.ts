export async function POST(req: Request) {
  // TODO: jsPDF等でPDF生成
  // return new Response(pdfBuffer, { headers: { "Content-Type": "application/pdf" } });
  return new Response("PDF生成ダミー", { headers: { "Content-Type": "text/plain" } });
} 