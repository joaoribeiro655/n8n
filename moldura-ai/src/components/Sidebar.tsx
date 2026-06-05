"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Visão geral", icon: "▣" },
  { href: "/dashboard/studio", label: "Estúdio", icon: "✦" },
  { href: "/dashboard/frames", label: "Molduras", icon: "▢" },
  { href: "/dashboard/gallery", label: "Galeria", icon: "▦" },
  { href: "/dashboard/branding", label: "Identidade visual", icon: "◐" },
  { href: "/dashboard/team", label: "Equipe", icon: "◇" },
];

export default function Sidebar({
  tenantName,
  userEmail,
}: {
  tenantName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-black/30 p-4">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
        <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-sky-500 text-white">M</span>
        Moldura<span className="text-sky-400">.AI</span>
      </Link>

      <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-white">{tenantName}</p>
        <p className="truncate text-xs text-gray-500">{userEmail}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-sky-500/15 text-sky-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <span className="w-4 text-center opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button onClick={logout} className="btn-ghost mt-4 w-full justify-start">
        ⇥ Sair
      </button>
    </aside>
  );
}
