"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Version = {
  id: string;
  version: number;
  imageUrl: string;
  note: string | null;
  createdAt: string;
};

type Post = {
  id: string;
  date: string;
  title: string | null;
  copy: string;
  status: "PLANNED" | "GENERATED" | "APPROVED" | "REJECTED";
  feedback: string | null;
  frameId: string | null;
  versions: Version[];
};

type Frame = { id: string; name: string };

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

export default function CalendarBoard({ frames }: { frames: Frame[] }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // The drawer either edits an existing post (selectedId) or creates one on a day.
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

  // Build the calendar grid (leading/trailing days included as nulls).
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
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card">
        {/* Toolbar */}
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

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>

        {/* Day grid */}
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

      {/* Drawer */}
      <div>
        {selectedPost ? (
          <PostDetail
            key={selectedPost.id}
            post={selectedPost}
            frames={frames}
            onClose={() => setSelectedId(null)}
            onChanged={load}
          />
        ) : newDate ? (
          <PostCreate
            key={newDate}
            date={newDate}
            frames={frames}
            onClose={() => setNewDate(null)}
            onCreated={async (id) => { await load(); setNewDate(null); setSelectedId(id); }}
          />
        ) : (
          <div className="card text-sm text-gray-400">
            <p className="font-medium text-gray-200">Como usar</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4">
              <li>Passe o mouse num dia e clique no <span className="text-sky-300">+</span> para criar uma postagem.</li>
              <li>Escreva a copy e escolha a moldura/projeto.</li>
              <li>Clique em <span className="text-sky-300">Gerar arte</span> para abrir o estúdio e produzir a imagem.</li>
              <li>Volte aqui, <span className="text-emerald-300">aprove</span> ou <span className="text-rose-300">reprove</span> com um comentário para gerar a v2.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function PostCreate({
  date,
  frames,
  onClose,
  onCreated,
}: {
  date: string;
  frames: Frame[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [copy, setCopy] = useState("");
  const [frameId, setFrameId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
          frameId: frameId || null,
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
        <label className="label">Título (opcional)</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Promo do fim de semana" />
      </div>
      <div>
        <label className="label">Copy / legenda</label>
        <textarea className="input min-h-[120px]" value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="Texto do post..." />
      </div>
      <div>
        <label className="label">Moldura / projeto</label>
        <select className="input" value={frameId} onChange={(e) => setFrameId(e.target.value)}>
          <option value="">— escolher depois —</option>
          {frames.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
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
  frames,
  onClose,
  onChanged,
}: {
  post: Post;
  frames: Frame[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(post.title ?? "");
  const [copy, setCopy] = useState(post.copy);
  const [frameId, setFrameId] = useState(post.frameId ?? "");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const latest = post.versions[0] ?? null; // versions come ordered desc
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

  async function remove() {
    if (!confirm("Excluir esta postagem e todas as versões da arte?")) return;
    setBusy(true);
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    onClose();
    onChanged();
  }

  const studioHref = `/dashboard/studio?post=${post.id}${frameId ? `&frame=${frameId}` : ""}`;

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

      {/* Latest art preview */}
      {latest ? (
        <div>
          <img src={latest.imageUrl} alt="" className="w-full rounded-lg border border-white/10" />
          <p className="mt-1 text-center text-xs text-gray-500">
            Versão atual: v{latest.version}
            {post.versions.length > 1 && ` • ${post.versions.length} versões`}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-gray-500">
          Nenhuma arte gerada ainda.
        </div>
      )}

      {/* Generate / regenerate */}
      <Link href={studioHref} className="btn-primary block w-full text-center">
        {latest ? `Gerar nova versão (v${latest.version + 1})` : "Gerar arte no estúdio"}
      </Link>

      {/* Approval loop */}
      {latest && (
        <div className="space-y-2 rounded-lg border border-white/10 p-3">
          <button
            onClick={() => patch({ status: "APPROVED" }, "Aprovado ✓")}
            disabled={busy}
            className="btn-ghost w-full justify-center border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            ✓ Aprovar arte
          </button>
          <textarea
            className="input min-h-[64px] text-sm"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="O que ajustar na próxima versão?"
          />
          <button
            onClick={() => { patch({ status: "REJECTED", feedback: feedback || null }, "Reprovado — gere a v" + (latest.version + 1)); }}
            disabled={busy}
            className="btn-ghost w-full justify-center border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
          >
            ✕ Reprovar / pedir nova versão
          </button>
        </div>
      )}

      {post.feedback && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          <span className="font-medium">Último feedback:</span> {post.feedback}
        </p>
      )}

      {/* Edit fields */}
      <details className="rounded-lg border border-white/10">
        <summary className="cursor-pointer px-3 py-2 text-sm text-gray-300">Editar copy / moldura</summary>
        <div className="space-y-3 p-3 pt-0">
          <div>
            <label className="label">Título</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Copy / legenda</label>
            <textarea className="input min-h-[100px]" value={copy} onChange={(e) => setCopy(e.target.value)} />
          </div>
          <div>
            <label className="label">Moldura / projeto</label>
            <select className="input" value={frameId} onChange={(e) => setFrameId(e.target.value)}>
              <option value="">— nenhuma —</option>
              {frames.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => patch({ title: title || null, copy, frameId: frameId || null }, "Salvo ✓")}
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
