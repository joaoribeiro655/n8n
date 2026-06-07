"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function back() {
    setBusy(true);
    await fetch("/api/admin/stop-impersonate", { method: "POST" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-black">
      <span>
        ★ Modo admin — você está configurando a loja <strong>{tenantName}</strong>.
      </span>
      <button
        onClick={back}
        disabled={busy}
        className="rounded-md bg-black/85 px-3 py-1 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
      >
        {busy ? "Voltando..." : "Sair do modo admin"}
      </button>
    </div>
  );
}
