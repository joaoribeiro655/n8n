import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) return null;

  const [tenant, studioCount, frameCount, artworkCount, userCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.tenantId } }),
    prisma.studio.count({ where: { tenantId: session.tenantId } }),
    prisma.frame.count({ where: { tenantId: session.tenantId } }),
    prisma.artwork.count({ where: { tenantId: session.tenantId } }),
    prisma.user.count({ where: { tenantId: session.tenantId } }),
  ]);
  if (!tenant) return null;

  const brandingDone = Boolean(tenant.logoUrl && tenant.phone);

  const stats = [
    { label: "Estúdios (HTML)", value: studioCount, href: "/dashboard/studios" },
    { label: "Molduras", value: frameCount, href: "/dashboard/frames" },
    { label: "Artes geradas", value: artworkCount, href: "/dashboard/gallery" },
    { label: "Usuários", value: userCount, href: "/dashboard/team" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Olá, {tenant.name} 👋</h1>
      <p className="mt-1 text-gray-400">Tudo pronto para criar suas artes de marketing.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card transition hover:border-sky-500/40">
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className="mt-2 text-4xl font-bold text-white">{s.value}</p>
          </Link>
        ))}
      </div>

      {!brandingDone && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div>
            <p className="font-semibold text-amber-200">Complete sua identidade visual</p>
            <p className="text-sm text-amber-200/70">
              Adicione o logo e o telefone para que as molduras saiam com a sua marca.
            </p>
          </div>
          <Link href="/dashboard/branding" className="btn-primary">Configurar</Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/studios" className="card group transition hover:border-sky-500/40">
          <h3 className="text-lg font-semibold text-white group-hover:text-sky-300">🎨 Estúdios (HTML)</h3>
          <p className="mt-2 text-sm text-gray-400">
            Importe os estúdios que você criou no Claude Design e use-os aqui.
          </p>
        </Link>
        <Link href="/dashboard/studio" className="card group transition hover:border-sky-500/40">
          <h3 className="text-lg font-semibold text-white group-hover:text-sky-300">✦ Editor de molduras</h3>
          <p className="mt-2 text-sm text-gray-400">
            Escolha uma moldura, arraste a foto do carro e baixe a arte final.
          </p>
        </Link>
        <Link href="/dashboard/frames" className="card group transition hover:border-sky-500/40">
          <h3 className="text-lg font-semibold text-white group-hover:text-sky-300">▢ Gerenciar molduras</h3>
          <p className="mt-2 text-sm text-gray-400">
            Gere uma moldura automática com sua marca ou importe a do Claude Design.
          </p>
        </Link>
      </div>
    </div>
  );
}
