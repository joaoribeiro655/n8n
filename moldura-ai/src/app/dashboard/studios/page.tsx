import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StudiosManager from "@/components/StudiosManager";

export default async function StudiosPage() {
  const session = await getSession();
  if (!session) return null;

  const studios = await prisma.studio.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Estúdios (Claude Design)</h1>
      <p className="mt-1 text-gray-400">
        Importe os estúdios em HTML que você criou no Claude Design e use-os aqui,
        com login e por concessionária.
      </p>
      <div className="mt-8">
        <StudiosManager
          initial={studios.map((s) => ({
            id: s.id,
            name: s.name,
            htmlUrl: s.htmlUrl,
            createdAt: s.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
