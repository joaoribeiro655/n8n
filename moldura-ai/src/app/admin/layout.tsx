import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-black font-bold">
              ★
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">Admin da plataforma</p>
              <p className="text-xs text-gray-500">{session.email}</p>
            </div>
          </div>
          <Link href="/dashboard" className="btn-ghost">
            ← Voltar ao painel
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
