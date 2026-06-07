import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
  });
  if (!tenant) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        tenantName={tenant.name}
        userEmail={session.email}
        isSuperAdmin={session.isSuperAdmin}
      />
      <main className="flex-1 overflow-auto">
        {session.impersonating && <ImpersonationBanner tenantName={tenant.name} />}
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
