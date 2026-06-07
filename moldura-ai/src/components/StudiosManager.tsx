"use client";

import { useState } from "react";
import Link from "next/link";
import { uploadBlob } from "@/lib/client";

type Studio = { id: string; name: string; htmlUrl: string; createdAt: string };

export default function StudiosManager({ initial }: { initial: Studio[] }) {
  const [studios, setStudios] = useState(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function importHtml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      // Browsers sometimes report an empty type for .html — force it.
      const html =
        file.type === "text/html"
          ? file
          : new File([file], file.name, { type: "text/html" });
      const url = await uploadBlob(html, "studio", file.name);
      const res = await fetch("/api/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || file.name.replace(/.html?$/i, ""),
          htmlUrl: url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudios((s) => [data.studio, ...s]);
      setName("");
      setMsg("Estúdio importado ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Falha ao importar");
    }
    setBusy(false);
    e.target.value = "";
  }

  async function remove(id: string) {
    if (!confirm("Excluir este estúdio?")) return;
    const res = await fetch(`/api/studios/${id}`, { method: "DELETE" });
    if (res.ok) setStudios((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="text-lg font-semibold">⬆ Importar estúdio do Claude Design</h2>
        <p className="mt-1 text-sm text-gray-400">
          Exporte o seu estúdio no Claude Design como arquivo <strong>.html</strong> e
          envie aqui. Ele passa a funcionar dentro da plataforma, com a marca da loja.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label">Nome do estúdio</label>
            <input
              className="input"
              placeholder="Ex.: CR4 Veículos — Estúdio de Export"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <label className="btn-primary cursor-pointer whitespace-nowrap">
            {busy ? "Enviando..." : "Selecionar arquivo .html"}
            <input type="file" accept=".html,text/html" className="hidden" onChange={importHtml} />
          </label>
        </div>
        {msg && <p className="mt-3 text-sm text-gray-300">{msg}</p>}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Seus estúdios ({studios.length})</h2>
        {studios.length === 0 ? (
          <div className="card text-center text-gray-400">
            Nenhum estúdio ainda. Importe o seu HTML do Claude Design acima.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studios.map((s) => (
              <div key={s.id} className="card flex flex-col">
                <div className="flex h-28 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-transparent text-3xl">
                  🎨
                </div>
                <p className="mt-3 truncate font-medium text-white">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Link href={`/studios/${s.id}`} className="btn-primary px-3 py-1.5 text-xs">
                    Abrir estúdio
                  </Link>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-xs text-gray-500 hover:text-red-300"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
