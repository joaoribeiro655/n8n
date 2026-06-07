"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readableTextColor } from "@/lib/utils";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  createdAt: string;
  owner: { name: string; email: string } | null;
  counts: { users: number; frames: number; artworks: number };
};

export default function AdminPanel({
  initialTenants,
  currentTenantId,
}: {
  initialTenants: Tenant[];
  currentTenantId: string;
}) {
  const router = useRouter();
  const [tenants, setTenants] = useState(initialTenants);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function manage(t: Tenant) {
    setManagingId(t.id);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: t.id }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setMsg((await res.json()).error ?? "Falha ao abrir a loja");
      setManagingId(null);
    }
  }

  const totals = tenants.reduce(
    (acc, t) => ({
      users: acc.users + t.counts.users,
      frames: acc.frames + t.counts.frames,
      artworks: acc.artworks + t.counts.artworks,
    }),
    { users: 0, frames: 0, artworks: 0 },
  );

  async function refresh() {
    const res = await fetch("/api/admin/tenants");
    if (res.ok) setTenants((await res.json()).tenants);
  }

  async function createTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealershipName: form.get("dealershipName"),
        ownerName: form.get("ownerName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      setMsg(`Loja "${data.tenant.name}" criada ✓`);
      await refresh();
    } else {
      setMsg(data.error ?? "Falha ao criar loja");
    }
    setBusy(false);
  }

  async function remove(t: Tenant) {
    if (t.id === currentTenantId) {
      alert("Você não pode excluir a loja em que está logado.");
      return;
    }
    if (!confirm(`Excluir "${t.name}" e TODOS os dados (usuários, molduras, artes)? Esta ação é irreversível.`)) return;
    const res = await fetch(`/api/admin/tenants/${t.id}`, { method: "DELETE" });
    if (res.ok) setTenants((x) => x.filter((i) => i.id !== t.id));
    else alert((await res.json()).error ?? "Falha ao excluir");
  }

  const stats = [
    { label: "Concessionárias", value: tenants.length },
    { label: "Usuários", value: totals.users },
    { label: "Molduras", value: totals.frames },
    { label: "Artes geradas", value: totals.artworks },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Concessionárias</h1>
          <p className="mt-1 text-gray-400">Gerencie todas as lojas da plataforma.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nova concessionária"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={createTenant} className="card mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold">Nova concessionária</h2>
            <p className="text-sm text-gray-400">Cria a loja e o acesso do dono.</p>
          </div>
          <div>
            <label className="label">Nome da concessionária</label>
            <input name="dealershipName" required className="input" placeholder="Auto Center Premium" />
          </div>
          <div>
            <label className="label">Nome do responsável</label>
            <input name="ownerName" required className="input" placeholder="João Ribeiro" />
          </div>
          <div>
            <label className="label">E-mail de acesso</label>
            <input name="email" type="email" required className="input" placeholder="dono@loja.com.br" />
          </div>
          <div>
            <label className="label">Senha inicial</label>
            <input name="password" type="password" required minLength={6} className="input" placeholder="mín. 6 caracteres" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary" disabled={busy}>
              {busy ? "Criando..." : "Criar concessionária"}
            </button>
          </div>
        </form>
      )}

      {msg && <p className="mt-4 text-sm text-gray-300">{msg}</p>}

      <div className="mt-6 space-y-3">
        {tenants.map((t) => (
          <div key={t.id} className="card flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl"
                style={{ background: t.primaryColor, color: readableTextColor(t.primaryColor) }}
              >
                {t.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="font-bold">{t.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">
                  {t.name}
                  {t.id === currentTenantId && (
                    <span className="ml-2 rounded bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">você</span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {t.owner ? `${t.owner.name} · ${t.owner.email}` : "sem dono"} · /{t.slug}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 text-center">
              <Stat n={t.counts.users} l="usuários" />
              <Stat n={t.counts.frames} l="molduras" />
              <Stat n={t.counts.artworks} l="artes" />
              <button
                onClick={() => manage(t)}
                disabled={managingId === t.id}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                {managingId === t.id ? "Abrindo..." : "Gerenciar loja"}
              </button>
              <button
                onClick={() => remove(t)}
                disabled={t.id === currentTenantId}
                className="text-sm text-gray-500 hover:text-red-300 disabled:opacity-30"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="hidden sm:block">
      <p className="text-lg font-bold text-white">{n}</p>
      <p className="text-[10px] uppercase text-gray-500">{l}</p>
    </div>
  );
}
