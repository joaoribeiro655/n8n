import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="relative overflow-hidden">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-sky-500/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-sky-500 text-white">
            M
          </span>
          Moldura<span className="text-sky-400">.AI</span>
        </div>
        <nav className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard" className="btn-primary">
              Ir para o painel
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link href="/register" className="btn-primary">
                Criar conta grátis
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-sky-300">
          ● Multi-tenant • Uma identidade visual por concessionária
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Molduras de marketing prontas em{" "}
          <span className="bg-gradient-to-r from-sky-400 to-amber-300 bg-clip-text text-transparent">
            segundos
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
          Cada loja tem sua marca. A IA gera a moldura com o logo, as cores e o
          contato da concessionária. O vendedor só arrasta a foto do carro — e a
          arte sai pronta para Instagram e WhatsApp.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href={session ? "/dashboard/studio" : "/register"} className="btn-primary px-6 py-3 text-base">
            Começar agora
          </Link>
          <Link href="/login" className="btn-ghost px-6 py-3 text-base">
            Já tenho conta
          </Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-5 sm:grid-cols-3">
          {[
            {
              t: "1. Configure a marca",
              d: "Logo, cores, fonte e contato da concessionária. Sua identidade fica salva.",
            },
            {
              t: "2. Moldura automática",
              d: "A IA monta a moldura com o seu branding — ou importe a sua do Claude Design.",
            },
            {
              t: "3. Arraste a foto",
              d: "Posicione, ajuste o zoom e baixe a arte final em alta resolução.",
            },
          ].map((c) => (
            <div key={c.t} className="card text-left">
              <h3 className="text-base font-semibold text-white">{c.t}</h3>
              <p className="mt-2 text-sm text-gray-400">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        Moldura.AI — feito para concessionárias.
      </footer>
    </main>
  );
}
