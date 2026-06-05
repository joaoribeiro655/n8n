"use client";

import { useState } from "react";
import Link from "next/link";
import { generateFrame, FRAME_STYLES, type FrameStyle } from "@/lib/frameGenerator";
import { dataUrlToBlob, uploadBlob, type BrandDTO, type FrameDTO } from "@/lib/client";

export default function FramesManager({
  brand,
  initialFrames,
}: {
  brand: BrandDTO;
  initialFrames: FrameDTO[];
}) {
  const [frames, setFrames] = useState<FrameDTO[]>(initialFrames);
  const [style, setStyle] = useState<FrameStyle>("header-footer");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importName, setImportName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function buildPreview(s: FrameStyle) {
    setStyle(s);
    const { dataUrl } = await generateFrame(brand, s);
    setPreview(dataUrl);
  }

  async function saveGenerated() {
    setBusy(true);
    setMsg(null);
    try {
      const { dataUrl, slot, width, height } = await generateFrame(brand, style);
      const url = await uploadBlob(dataUrlToBlob(dataUrl), "frame");
      const res = await fetch("/api/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${FRAME_STYLES.find((f) => f.id === style)?.label} — ${brand.name}`,
          imageUrl: url,
          width,
          height,
          slotX: slot.x,
          slotY: slot.y,
          slotW: slot.w,
          slotH: slot.h,
          source: "GENERATED",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFrames((f) => [data.frame, ...f]);
      setPreview(null);
      setMsg("Moldura gerada e salva ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao gerar");
    }
    setBusy(false);
  }

  async function importFrame(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await uploadBlob(file, "frame", file.name);
      const res = await fetch("/api/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: importName || file.name.replace(/.[^.]+$/, ""),
          imageUrl: url,
          source: "IMPORTED",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFrames((f) => [data.frame, ...f]);
      setImportName("");
      setMsg("Moldura importada ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Falha ao importar");
    }
    setBusy(false);
    e.target.value = "";
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta moldura?")) return;
    const res = await fetch(`/api/frames/${id}`, { method: "DELETE" });
    if (res.ok) setFrames((f) => f.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Auto generate */}
        <div className="card">
          <h2 className="text-lg font-semibold">✦ Gerar moldura automática</h2>
          <p className="mt-1 text-sm text-gray-400">
            A IA monta a moldura usando o seu logo, cores e contato. Escolha um estilo:
          </p>
          <div className="mt-4 grid gap-2">
            {FRAME_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => buildPreview(s.id)}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                  style === s.id
                    ? "border-sky-500/60 bg-sky-500/10"
                    : "border-white/10 bg-black/20 hover:bg-white/5"
                }`}
              >
                <span className="font-semibold text-white">{s.label}</span>
                <span className="block text-xs text-gray-400">{s.desc}</span>
              </button>
            ))}
          </div>
          {preview && (
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="prévia" className="mx-auto w-48 rounded-lg border border-white/10" style={{ background: "#222" }} />
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button className="btn-ghost" onClick={() => buildPreview(style)}>Pré-visualizar</button>
            <button className="btn-primary" onClick={saveGenerated} disabled={busy}>
              {busy ? "Gerando..." : "Gerar e salvar"}
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="card">
          <h2 className="text-lg font-semibold">▢ Importar moldura</h2>
          <p className="mt-1 text-sm text-gray-400">
            Já criou uma moldura no Claude Design? Exporte como PNG (com o centro
            transparente) e importe aqui.
          </p>
          <div className="mt-4">
            <label className="label">Nome da moldura</label>
            <input
              className="input"
              placeholder="Ex.: Promoção de Maio"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
            />
          </div>
          <label className="btn-primary mt-4 cursor-pointer">
            {busy ? "Enviando..." : "Selecionar PNG"}
            <input type="file" accept="image/png,image/webp" className="hidden" onChange={importFrame} />
          </label>
          <p className="mt-3 text-xs text-gray-500">
            Recomendado: 1080×1080px, PNG com área transparente para a foto.
          </p>
        </div>
      </div>

      {msg && <p className="text-sm text-gray-300">{msg}</p>}

      {/* Frame list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Suas molduras ({frames.length})</h2>
        {frames.length === 0 ? (
          <div className="card text-center text-gray-400">
            Nenhuma moldura ainda. Gere uma automática ou importe a sua.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {frames.map((f) => (
              <div key={f.id} className="card p-3">
                <div className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-[conic-gradient(#1a2233_0_25%,#0f1626_0_50%)] bg-[length:24px_24px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.imageUrl} alt={f.name} className="h-full w-full object-contain" />
                </div>
                <p className="mt-2 truncate text-sm font-medium text-white">{f.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase text-gray-500">
                    {f.source === "GENERATED" ? "Automática" : "Importada"}
                  </span>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/studio?frame=${f.id}`} className="text-xs text-sky-400 hover:underline">
                      Usar
                    </Link>
                    <button onClick={() => remove(f.id)} className="text-xs text-gray-500 hover:text-red-300">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
