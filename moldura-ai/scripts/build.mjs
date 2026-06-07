// Build script resiliente para a Vercel.
// - Aceita o nome de variável de banco que a Vercel/Neon criar automaticamente
//   (DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, etc.)
// - Se ainda não houver banco configurado, faz o build mesmo assim (sem criar
//   tabelas), pra você conseguir ligar o banco e refazer o deploy sem susto.
import { execSync } from "node:child_process";

const candidate =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

const hasRealDb = candidate.startsWith("postgres");

// O Prisma exige que a variável exista mesmo só para gerar o client.
process.env.DATABASE_URL = hasRealDb
  ? candidate
  : "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });

run("prisma generate");

if (hasRealDb) {
  run("prisma db push --skip-generate");
} else {
  console.log(
    "\n⚠️  Nenhum banco de dados conectado ainda — pulando a criação de tabelas.\n" +
      "   Conecte o Postgres (Storage) e clique em Redeploy que tudo será criado.\n",
  );
}

run("next build");
