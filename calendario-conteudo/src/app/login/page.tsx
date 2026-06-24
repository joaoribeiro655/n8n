"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push("/dashboard/calendar");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao entrar");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">Calendário de Conteúdo</h1>
          <p className="mt-1 text-sm text-gray-400">Entre para planejar e aprovar os posts.</p>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-center text-sm text-gray-500">
          Não tem conta?{" "}
          <Link href="/register" className="text-sky-400 hover:underline">
            Criar cliente
          </Link>
        </p>
      </form>
    </main>
  );
}
