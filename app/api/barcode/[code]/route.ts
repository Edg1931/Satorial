import { NextRequest } from "next/server";
import { code128SVG } from "@/lib/barcode";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).replace(/\.svg$/, "");
  const url = new URL(req.url);
  const print = url.searchParams.get("print");
  if (print) {
    const labels = Array.from({ length: 30 }, () => code128SVG(code, { height: 50, width: 1.5 })).join('<div class="label">$_</div>');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${code}</title>
<style>
  body { font-family: ui-sans-serif, system-ui; padding: 16px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .label { border: 1px dashed #999; padding: 8px; text-align: center; }
  @media print { body { padding: 0 } .label { border: none } }
</style></head>
<body><div class="grid">${Array.from({ length: 30 }, () => `<div class="label">${code128SVG(code, { height: 50, width: 1.5 })}</div>`).join("")}</div>
<script>setTimeout(() => window.print(), 100)</script></body></html>`;
    return new Response(html, { headers: { "content-type": "text/html" } });
  }
  const svg = code128SVG(code, { height: 80, width: 2.5 });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "content-disposition": `inline; filename="${code}.svg"` } });
}
