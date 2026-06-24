import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export const maxDuration = 60;

// GET /api/gallery/zip?month=YYYY-MM
// Baixa, em um .zip, as artes aprovadas do mês (a versão atual de cada post).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Response("Mês inválido", { status: 400 });
  }
  const [y, m] = month.split("-").map(Number);
  const gte = new Date(y, m - 1, 1);
  const lt = new Date(y, m, 1);

  const posts = await prisma.post.findMany({
    where: { tenantId: session.tenantId, status: "APPROVED", date: { gte, lt } },
    orderBy: { date: "asc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  const zip = new JSZip();
  let added = 0;
  for (const post of posts) {
    const art = post.versions[0];
    if (!art) continue;
    try {
      const res = await fetch(art.imageUrl);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const day = String(post.date.getDate()).padStart(2, "0");
      const safeTitle = (post.title || "post").replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 40).trim();
      zip.file(`${day} - ${safeTitle || "post"}.png`, buf);
      added++;
    } catch {
      // ignora arte que falhar ao baixar
    }
  }

  if (added === 0) return new Response("Nenhuma arte aprovada neste mês", { status: 404 });

  const content = await zip.generateAsync({ type: "uint8array" });
  // Recopia para um Uint8Array<ArrayBuffer> concreto (atrito de tipos do TS 5.7).
  const bytes = new Uint8Array(content);
  return new Response(new Blob([bytes], { type: "application/zip" }), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="artes-${month}.zip"`,
    },
  });
}
