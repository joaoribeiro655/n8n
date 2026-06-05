"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealershipName: form.get("dealershipName"),
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (res.ok) {
      router.push("/dashboard/branding");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Falha ao criar conta");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-bold">
          <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-sky-500 text-white">M</span>
          Moldura<span className="text-sky-400">.AI</span>
        </Link>
        <div className="card">
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="mt-1 text-sm text-gray-400">Cadastre sua concessionária e comece a gerar molduras.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="dealershipName">Nome da concessionária</label>
              <input id="dealershipName" name="dealershipName" required className="input" placeholder="Auto Center Premium" />
            </div>
            <div>
              <label className="label" htmlFor="name">Seu nome</label>
              <input id="name" name="name" required className="input" placeholder="João Ribeiro" />
            </div>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required className="input" placeholder="voce@loja.com.br" />
            </div>
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" required minLength={6} className="input" placeholder="mínimo 6 caracteres" />
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Criando..." : "Criar conta grátis"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-gray-400">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-sky-400 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
