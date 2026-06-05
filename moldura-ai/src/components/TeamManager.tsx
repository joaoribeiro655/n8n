"use client";

import { useState } from "react";

type Member = { id: string; name: string; email: string; role: string };

export default function TeamManager({
  initial,
  canManage,
}: {
  initial: Member[];
  canManage: boolean;
}) {
  const [members, setMembers] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMembers((m) => [...m, data.user]);
      (e.target as HTMLFormElement).reset();
      setMsg("Usuário adicionado ✓");
    } else {
      setMsg(data.error ?? "Falha ao adicionar");
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h2 className="text-lg font-semibold">Usuários ({members.length})</h2>
        <ul className="mt-4 divide-y divide-white/5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">{m.name}</p>
                <p className="text-xs text-gray-500">{m.email}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${m.role === "OWNER" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-gray-300"}`}>
                {m.role === "OWNER" ? "Dono" : "Membro"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {canManage && (
        <div className="card">
          <h2 className="text-lg font-semibold">Adicionar usuário</h2>
          <p className="mt-1 text-sm text-gray-400">
            Crie acessos para os vendedores da loja.
          </p>
          <form onSubmit={add} className="mt-4 space-y-3">
            <input name="name" required placeholder="Nome" className="input" />
            <input name="email" type="email" required placeholder="E-mail" className="input" />
            <input name="password" type="password" required minLength={6} placeholder="Senha (mín. 6)" className="input" />
            <select name="role" className="input" defaultValue="MEMBER">
              <option value="MEMBER">Membro (vendedor)</option>
              <option value="OWNER">Dono (admin)</option>
            </select>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Adicionando..." : "Adicionar"}
            </button>
            {msg && <p className="text-sm text-gray-300">{msg}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
