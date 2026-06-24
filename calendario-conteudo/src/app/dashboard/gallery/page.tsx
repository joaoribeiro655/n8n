import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const now = new Date();
  const current = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthParam(now);
  const [y, m] = current.split("-").map(Number);
  const gte = new Date(y, m - 1, 1);
  const lt = new Date(y, m, 1);

  const prev = monthParam(new Date(y, m - 2, 1));
  const next = monthParam(new Date(y, m, 1));

  type GalleryPost = {
    id: string;
    date: Date;
    title: string | null;
    versions: { imageUrl: string }[];
  };
  const posts = (await prisma.post.findMany({
    where: { tenantId: session.tenantId, status: "APPROVED", date: { gte, lt } },
    orderBy: { date: "asc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  })) as GalleryPost[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Galeria</h1>
          <p className="mt-1 text-gray-400">Artes aprovadas, prontas para publicar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/gallery?month=${prev}`} className="btn-ghost px-3 py-1.5">‹</Link>
          <span className="min-w-[150px] text-center font-semibold">{MONTHS[m - 1]} {y}</span>
          <Link href={`/dashboard/gallery?month=${next}`} className="btn-ghost px-3 py-1.5">›</Link>
          {posts.length > 0 && (
            <a href={`/api/gallery/zip?month=${current}`} className="btn-primary ml-2">⬇ Baixar mês (.zip)</a>
          )}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-white/10 p-10 text-center text-gray-500">
          Nenhuma arte aprovada em {MONTHS[m - 1]} {y}.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((p) => {
            const art = p.versions[0];
            const day = String(p.date.getDate()).padStart(2, "0");
            return (
              <div key={p.id} className="card p-2">
                {art ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art.imageUrl} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <div className="aspect-square w-full rounded-lg bg-white/5" />
                )}
                <div className="mt-2 flex items-center justify-between px-1 pb-1 text-xs">
                  <span className="truncate text-gray-300">{day} • {p.title || "Post"}</span>
                  {art && <a href={art.imageUrl} download className="text-sky-400 hover:underline">baixar</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
