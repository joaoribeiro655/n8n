import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudioEmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!studio) notFound();

  return (
    <div className="flex h-screen flex-col bg-black">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/studios" className="btn-ghost px-3 py-1.5 text-xs">
            ← Voltar
          </Link>
          <span className="text-sm font-medium text-gray-200">{studio.name}</span>
        </div>
        <a
          href={studio.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-400 hover:underline"
        >
          Abrir em nova aba ↗
        </a>
      </header>
      <iframe
        src={studio.htmlUrl}
        title={studio.name}
        className="min-h-0 flex-1 border-0 bg-white"
        sandbox="allow-scripts allow-downloads allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
