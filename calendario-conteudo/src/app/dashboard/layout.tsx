import { redirect } from "next/navigation";
import { getSession, getCurrentTenant } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenant = await getCurrentTenant();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-panel/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded bg-sky-500/20 text-sm font-bold text-sky-300">
                {tenant?.name?.charAt(0) ?? "C"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">{tenant?.name ?? "Cliente"}</p>
              <p className="text-xs text-gray-500">Calendário de Conteúdo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="hidden sm:inline">{session.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
