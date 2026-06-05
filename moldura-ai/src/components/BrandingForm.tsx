"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readableTextColor } from "@/lib/utils";

export type BrandingValues = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  tagline: string | null;
};

const FONTS = ["Inter", "Poppins", "Montserrat", "Roboto", "Oswald", "Bebas Neue"];

export default function BrandingForm({ initial }: { initial: BrandingValues }) {
  const router = useRouter();
  const [v, setV] = useState<BrandingValues>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof BrandingValues>(key: K, value: BrandingValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "logo");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) set("logoUrl", data.url);
    else setMsg(data.error ?? "Falha no upload do logo");
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Identidade visual salva ✓");
      router.refresh();
    } else {
      setMsg(data.error ?? "Falha ao salvar");
    }
    setSaving(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Dados da loja</h2>
          <div>
            <label className="label">Nome da concessionária</label>
            <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Slogan / chamada</label>
            <input className="input" placeholder="Seu próximo carro está aqui" value={v.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefone / WhatsApp</label>
              <input className="input" placeholder="(11) 99999-9999" value={v.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="label">Site</label>
              <input className="input" placeholder="www.loja.com.br" value={v.website ?? ""} onChange={(e) => set("website", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Endereço</label>
            <input className="input" placeholder="Av. Brasil, 1000 — Centro" value={v.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Cores da marca</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ColorField label="Primária" value={v.primaryColor} onChange={(c) => set("primaryColor", c)} />
            <ColorField label="Secundária" value={v.secondaryColor} onChange={(c) => set("secondaryColor", c)} />
            <ColorField label="Destaque" value={v.accentColor} onChange={(c) => set("accentColor", c)} />
            <ColorField label="Texto" value={v.textColor} onChange={(c) => set("textColor", c)} />
          </div>
          <div>
            <label className="label">Fonte</label>
            <select className="input" value={v.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>
              {FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Logo</h2>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {v.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.logoUrl} alt="logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-gray-500">sem logo</span>
              )}
            </div>
            <label className="btn-ghost cursor-pointer">
              {uploading ? "Enviando..." : "Enviar logo (PNG)"}
              <input type="file" accept="image/png,image/svg+xml,image/webp" className="hidden" onChange={onLogo} />
            </label>
            {v.logoUrl && (
              <button className="text-sm text-gray-400 hover:text-red-300" onClick={() => set("logoUrl", null)}>
                Remover
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">Dica: use um PNG com fundo transparente para melhor resultado.</p>
        </div>

        <div className="flex items-center gap-4">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar identidade visual"}
          </button>
          {msg && <span className="text-sm text-gray-300">{msg}</span>}
        </div>
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="label">Prévia da marca</p>
        <div
          className="aspect-square overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
          style={{ background: v.secondaryColor, fontFamily: v.fontFamily }}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 p-5" style={{ background: v.primaryColor }}>
              {v.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.logoUrl} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded bg-white/20 text-sm font-bold" style={{ color: v.textColor }}>
                  {v.name.slice(0, 1)}
                </div>
              )}
              <span className="font-bold" style={{ color: readableTextColor(v.primaryColor) }}>
                {v.name}
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <p className="text-lg font-semibold" style={{ color: v.textColor }}>
                {v.tagline || "Seu slogan aqui"}
              </p>
            </div>
            <div className="p-4 text-center text-sm font-medium" style={{ background: v.accentColor, color: readableTextColor(v.accentColor) }}>
              {v.phone || "(00) 00000-0000"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-xs text-gray-200 focus:outline-none"
        />
      </div>
    </div>
  );
}
