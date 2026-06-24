"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DesignCanvas, { type DesignCanvasHandle } from "@/components/DesignCanvas";

type Version = {
  id: string;
  version: number;
  imageUrl: string;
  html: string | null;
  note: string | null;
  source: "CLAUDE" | "UPLOAD";
  createdAt: string;
};

type Post = {
  id: string;
  date: string;
  title: string | null;
  copy: string;
  briefing: string;
  photoUrl: string | null;
  designHtml: string | null;
  status: "PLANNED" | "GENERATED" | "APPROVED" | "REJECTED";
  feedback: string | null;
  versions: Version[];
};

const STATUS: Record<Post["status"], { label: string; dot: string; chip: string }> = {
  PLANNED: { label: "Planejado", dot: "bg-slate-400", chip: "bg-slate-500/15 text-slate-300" },
  GENERATED: { label: "Gerado — revisar", dot: "bg-amber-400", chip: "bg-amber-500/15 text-amber-300" },
  APPROVED: { label: "Aprovado", dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300" },
  REJECTED: { label: "Reprovado", dot: "bg-rose-400", chip: "bg-rose-500/15 text-rose-300" },
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function uploadImage(file: File | Blob, name = "arte.png"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file instanceof File ? file : new File([file], name, { type: "image/png" }));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.url as string;
}

export default function CalendarBoard({ claudeEnabled }: { claudeEnabled: boolean }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<string | null>(null);

  const monthParam = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/posts?month=${monthParam}`);
    const data = await res.json();
    setPosts(res.ok ? data.posts : []);
    setLoading(false);
  }, [monthParam]);

  useEffect(() => {
    load();
  }, [load]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const key = dateKey(new Date(p.date));
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const selectedPost = posts.find((p) => p.id === selectedId) ?? null;
  const todayKey = dateKey(today);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="btn-ghost px-3 py-1.5">‹</button>
            <h2 className="min-w-[180px] text-center text-lg font-semibold">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="btn-ghost px-3 py-1.5">›</button>
          </div>
          <button onClick={goToday} className="btn-ghost px-3 py-1.5 text-sm">Hoje</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="min-h-[92px] rounded-lg bg-white/[0.01]" />;
            const key = dateKey(cell);
            const dayPosts = postsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <div
                key={i}
                className={`group min-h-[92px] rounded-lg border p-1.5 transition ${
                  isToday ? "border-sky-500/40 bg-sky-500/5" : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isToday ? "font-bold text-sky-300" : "text-gray-400"}`}>
                    {cell.getDate()}
                  </span>
                  <button
                    onClick={() => { setNewDate(key); setSelectedId(null); }}
                    className="text-xs text-gray-600 opacity-0 transition hover:text-sky-300 group-hover:opacity-100"
                    title="Nova postagem"
                  >
                    +
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {dayPosts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedId(p.id); setNewDate(null); }}
                      className={`flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] leading-tight ${STATUS[p.status].chip}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS[p.status].dot}`} />
                      <span className="truncate">{p.title || p.copy || "Sem título"}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {loading && <p className="mt-3 text-center text-xs text-gray-500">Carregando...</p>}
      </div>

      <div>
        {selectedPost ? (
          <PostDetail
            key={selectedPost.id}
            post={selectedPost}
            claudeEnabled={claudeEnabled}
            onClose={() => setSelectedId(null)}
            onChanged={load}
          />
        ) : newDate ? (
          <PostCreate
            key={newDate}
            date={newDate}
            onClose={() => setNewDate(null)}
            onCreated={async (id) => { await load(); setNewDate(null); setSelectedId(id); }}
          />
        ) : (
          <div className="card text-sm text-gray-400">
            <p className="font-medium text-gray-200">Como usar</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4">
              <li>Passe o mouse num dia e clique no <span className="text-sky-300">+</span> para criar uma postagem.</li>
              <li>Escreva a copy e o briefing; se quiser, suba uma foto.</li>
              <li>Clique em <span className="text-sky-300">Gerar com o Claude Design</span> — o Claude cria a arte na identidade da marca (ou o robô faz isso 1 dia antes).</li>
              <li><span className="text-emerald-300">Aprove e exporte o PNG</span>, ou <span className="text-rose-300">reprove</span> com um comentário para gerar a próxima versão.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function PostCreate({
  date,
  onClose,
  onCreated,
}: {
  date: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [copy, setCopy] = useState("");
  const [briefing, setBriefing] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickPhoto(file: File) {
    setErr(null);
    try {
      setPhotoUrl(await uploadImage(file, file.name));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha no upload da foto");
    }
  }

  async function create() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(`${date}T12:00:00`).toISOString(),
          title: title || null,
          copy,
          briefing,
          photoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data.post.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao criar");
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Nova postagem — {date.split("-").reverse().join("/")}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
      </div>
      <div>
        <label className="label">Título / destaque (opcional)</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Promo do fim de semana" />
      </div>
      <div>
        <label className="label">Copy / legenda</label>
        <textarea className="input min-h-[100px]" value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="Texto do post..." />
      </div>
      <div>
        <label className="label">Briefing da arte (o que o Claude deve criar)</label>
        <textarea className="input min-h-[70px]" value={briefing} onChange={(e) => setBriefing(e.target.value)} placeholder="Ex.: arte de lançamento, destaque o preço, clima de fim de semana..." />
      </div>
      <div>
        <label className="label">Foto (opcional)</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(f); e.target.value = ""; }}
        />
        {photoUrl ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className="h-12 w-12 rounded object-cover" />
            <button onClick={() => setPhotoUrl(null)} className="text-xs text-gray-500 hover:text-rose-400">remover</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="btn-ghost w-full justify-center">⬆ Subir foto</button>
        )}
      </div>
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <button onClick={create} disabled={saving} className="btn-primary w-full">
        {saving ? "Criando..." : "Criar postagem"}
      </button>
    </div>
  );
}

function PostDetail({
  post,
  claudeEnabled,
  onClose,
  onChanged,
}: {
  post: Post;
  claudeEnabled: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(post.title ?? "");
  const [copy, setCopy] = useState(post.copy);
  const [briefing, setBriefing] = useState(post.briefing);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const canvasRef = useRef<DesignCanvasHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const latest = post.versions[0] ?? null;
  const dayLabel = dateKey(new Date(post.date)).split("-").reverse().join("/");

  async function patch(body: Record<string, unknown>, okMsg?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      if (okMsg) setMsg(okMsg);
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    }
    setBusy(false);
  }

  // Pede ao Claude Design um novo design (HTML on-brand). Não mexe em busy:
  // quem chama controla, para encadear reprovar → regerar.
  async function doGenerate(): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/posts/${post.id}/generate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "Falha ao gerar" };
    return { ok: true };
  }

  async function generate() {
    setBusy(true);
    setMsg("O Claude está criando a arte...");
    const r = await doGenerate();
    setMsg(r.ok ? "Arte criada ✓ — revise e aprove" : r.error ?? "Falha ao gerar");
    if (r.ok) onChanged();
    setBusy(false);
  }

  async function exportBlob(): Promise<Blob> {
    if (!canvasRef.current) throw new Error("Prévia não está pronta");
    return canvasRef.current.toBlob();
  }

  async function approveAndExport() {
    setBusy(true);
    setMsg("Exportando o PNG...");
    try {
      const blob = await exportBlob();
      const imageUrl = await uploadImage(blob);
      const res = await fetch(`/api/posts/${post.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, html: post.designHtml, source: "CLAUDE", approve: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg("Aprovado e exportado ✓");
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao exportar");
    }
    setBusy(false);
  }

  function triggerDownload(blob: Blob, ext: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dateKey(new Date(post.date))}-${post.title || "post"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPng() {
    setBusy(true);
    setMsg("Gerando o PNG...");
    try {
      triggerDownload(await exportBlob(), "png");
      setMsg("PNG baixado ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao baixar");
    }
    setBusy(false);
  }

  function downloadHtml() {
    if (!post.designHtml) return;
    triggerDownload(new Blob([post.designHtml], { type: "text/html;charset=utf-8" }), "html");
    setMsg("HTML baixado ✓");
  }

  // Reprovar: guarda o feedback e pede uma nova versão ao Claude com os ajustes.
  async function rejectFlow() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", feedback: feedback || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      if (claudeEnabled) {
        setMsg("Reprovado — o Claude está refazendo com os ajustes...");
        const r = await doGenerate();
        setMsg(r.ok ? "Nova versão criada ✓" : r.error ?? "Falha ao refazer");
      } else {
        setMsg("Reprovado.");
      }
      setFeedback("");
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao reprovar");
    }
    setBusy(false);
  }

  async function uploadFinalArt(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const imageUrl = await uploadImage(file, file.name);
      const res = await fetch(`/api/posts/${post.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, source: "UPLOAD", approve: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg("Arte enviada e aprovada ✓");
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha no upload");
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Excluir esta postagem e todas as versões da arte?")) return;
    setBusy(true);
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    onClose();
    onChanged();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{dayLabel}</h3>
          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] ${STATUS[post.status].chip}`}>
            {STATUS[post.status].label}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
      </div>

      {/* Design do Claude */}
      {post.designHtml ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400">Design criado pelo Claude</p>
          <DesignCanvas ref={canvasRef} html={post.designHtml} />
          <button onClick={approveAndExport} disabled={busy} className="btn-ghost w-full justify-center border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
            ✓ Aprovar + exportar PNG
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={downloadPng} disabled={busy} className="btn-ghost justify-center">⬇ Baixar PNG</button>
            <button onClick={downloadHtml} disabled={busy} className="btn-ghost justify-center">⬇ Baixar HTML</button>
          </div>
          <textarea
            className="input min-h-[60px] text-sm"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="O que ajustar? (vira a próxima versão)"
          />
          <button onClick={rejectFlow} disabled={busy} className="btn-ghost w-full justify-center border border-rose-500/30 text-rose-300 hover:bg-rose-500/10">
            ✕ Reprovar e refazer com o Claude
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-gray-500">
          Nenhuma arte ainda.
        </div>
      )}

      {/* Gerar / enviar */}
      <div className="space-y-2 rounded-lg border border-white/10 p-3">
        <button
          onClick={generate}
          disabled={busy || !claudeEnabled}
          className="btn-primary w-full"
          title={claudeEnabled ? "" : "Configure ANTHROPIC_API_KEY para ativar"}
        >
          {post.designHtml ? "↻ Gerar nova versão com o Claude" : "✨ Gerar com o Claude Design"}
        </button>
        {!claudeEnabled && (
          <p className="text-[11px] text-amber-300/80">Claude Design indisponível — envie a arte pronta abaixo.</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFinalArt(f); e.target.value = ""; }}
        />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost w-full justify-center">
          ⬆ Enviar arte pronta (aprova direto)
        </button>
      </div>

      {/* Arte publicada (PNG aprovado mais recente) */}
      {latest && (
        <div className="rounded-lg border border-white/10 p-3">
          <p className="mb-2 text-xs font-medium text-gray-400">
            Arte final — v{latest.version}
            {post.versions.length > 1 && ` • ${post.versions.length} versões`}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={latest.imageUrl} alt="" className="w-full rounded-lg border border-white/10" />
          <a href={latest.imageUrl} download className="mt-1 block text-center text-xs text-sky-400 hover:underline">⬇ baixar PNG</a>
        </div>
      )}

      {post.feedback && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          <span className="font-medium">Último feedback:</span> {post.feedback}
        </p>
      )}

      {/* Editar conteúdo */}
      <details className="rounded-lg border border-white/10">
        <summary className="cursor-pointer px-3 py-2 text-sm text-gray-300">Editar copy / briefing</summary>
        <div className="space-y-3 p-3 pt-0">
          <div>
            <label className="label">Título / destaque</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Copy / legenda</label>
            <textarea className="input min-h-[90px]" value={copy} onChange={(e) => setCopy(e.target.value)} />
          </div>
          <div>
            <label className="label">Briefing da arte</label>
            <textarea className="input min-h-[70px]" value={briefing} onChange={(e) => setBriefing(e.target.value)} />
          </div>
          <button
            onClick={() => patch({ title: title || null, copy, briefing }, "Salvo ✓")}
            disabled={busy}
            className="btn-ghost w-full"
          >
            Salvar alterações
          </button>
        </div>
      </details>

      {msg && <p className="text-center text-sm text-gray-300">{msg}</p>}

      <button onClick={remove} disabled={busy} className="w-full text-center text-xs text-gray-600 hover:text-rose-400">
        Excluir postagem
      </button>
    </div>
  );
}
