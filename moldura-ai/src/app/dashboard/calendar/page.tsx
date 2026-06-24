import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarBoard from "@/components/CalendarBoard";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) return null;

  const frames = await prisma.frame.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Calendário</h1>
      <p className="mt-1 text-gray-400">
        Planeje as postagens do mês: escreva a copy, escolha a moldura e gere a arte.
        Valide cada arte e peça novas versões quando precisar.
      </p>
      <div className="mt-8">
        <CalendarBoard frames={frames} />
      </div>
    </div>
  );
}
