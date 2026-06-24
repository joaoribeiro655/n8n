"use client";

import { useRef, useState } from "react";

type Tenant = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl: string | null;
  tagline: string | null;
};

const COLORS: { key: keyof Tenant; label: string }[] = [
  { key: "primaryColor", label: "Cor primária" },
  { key: "secondaryColor", label: "Cor de fundo" },
  { key: "accentColor", label: "Cor de destaque" },
  { key: "textColor", label: "Cor do texto" },
];

export default function BrandingForm({ initial }: { initial: Tenant }) {
  const [t, setT] = useState<Tenant>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Tenant>(key: K, value: Tenant[K]) {
    setT((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadLogo(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set("logoUrl", data.url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha no upload do logo");
    }
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg("Brand guide salvo ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao salvar");
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card space-y-5">
        <div>
          <label className="label">Nome da marca</label>
          <input className="input" value={t.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="label">Tagline (aparece na arte)</label>
          <input className="input" value={t.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Ex.: A sua marca, do seu jeito" />
        </div>
        <div>
          <label className="label">Fonte</label>
          <input className="input" value={t.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} placeholder="Inter" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {COLORS.map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={t[key] as string}
                  onChange={(e) => set(key, e.target.value as Tenant[typeof key])}
                  className="h-9 w-12 rounded border border-white/10 bg-transparent"
                />
                <input
                  className="input"
                  value={t[key] as string}
                  onChange={(e) => set(key, e.target.value as Tenant[typeof key])}
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="label">Logo</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }}
          />
          <div className="flex items-center gap-3">
            {t.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logoUrl} alt="" className="h-12 w-12 rounded bg-white/5 object-contain p-1" />
            )}
            <button onClick={() => fileRef.current?.click()} className="btn-ghost">
              {t.logoUrl ? "Trocar logo" : "Subir logo"}
            </button>
            {t.logoUrl && (
              <button onClick={() => set("logoUrl", null)} className="text-xs text-gray-500 hover:text-rose-400">remover</button>
            )}
          </div>
        </div>

        {msg && <p className="text-sm text-gray-300">{msg}</p>}
        <button onClick={save} disabled={busy} className="btn-primary w-full">
          {busy ? "Salvando..." : "Salvar brand guide"}
        </button>
      </div>

      {/* Prévia */}
      <div>
        <p className="label">Prévia da arte</p>
        <div
          className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10"
          style={{ backgroundImage: `linear-gradient(135deg, ${t.secondaryColor} 0%, ${t.primaryColor} 100%)` }}
        >
          <div className="absolute left-4 top-4">
            {t.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logoUrl} alt="" className="h-8 object-contain" />
            ) : (
              <span className="text-sm font-bold" style={{ color: t.textColor }}>{t.name}</span>
            )}
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="mb-2 h-1.5 w-10" style={{ backgroundColor: t.accentColor }} />
            <p className="text-xl font-extrabold leading-tight" style={{ color: t.textColor, fontFamily: t.fontFamily }}>
              Seu título aqui
            </p>
            <p className="mt-1 text-sm" style={{ color: t.textColor, opacity: 0.9 }}>
              A copy do post aparece nesta área.
            </p>
            {t.tagline && (
              <p className="mt-2 text-xs font-semibold" style={{ color: t.accentColor }}>{t.tagline}</p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          É assim que a plataforma vai montar as artes. O brand guide vem do seu projeto no Claude Design.
        </p>
      </div>
    </div>
  );
}
