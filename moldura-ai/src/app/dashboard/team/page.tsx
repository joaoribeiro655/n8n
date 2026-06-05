import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TeamManager from "@/components/TeamManager";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return null;

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Equipe</h1>
      <p className="mt-1 text-gray-400">
        Gerencie quem tem acesso ao painel da concessionária.
      </p>
      <div className="mt-8">
        <TeamManager initial={users} canManage={session.role === "OWNER"} />
      </div>
    </div>
  );
}
