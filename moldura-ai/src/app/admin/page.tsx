import { getSuperAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminHome() {
  const session = await getSuperAdminSession();
  if (!session) return null;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, frames: true, artworks: true } },
      users: { where: { role: "OWNER" }, select: { name: true, email: true }, take: 1 },
    },
  });

  return (
    <AdminPanel
      currentTenantId={session.tenantId}
      initialTenants={tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logoUrl: t.logoUrl,
        primaryColor: t.primaryColor,
        createdAt: t.createdAt.toISOString(),
        owner: t.users[0] ?? null,
        counts: t._count,
      }))}
    />
  );
}
