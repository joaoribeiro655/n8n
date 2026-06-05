// Promote an existing user to platform super-admin.
// Usage: npm run admin:promote -- email@dominio.com
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: npm run admin:promote -- email@dominio.com");
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email },
    data: { isSuperAdmin: true },
  }).catch(() => null);

  if (!user) {
    console.error(`Usuário "${email}" não encontrado. Crie a conta primeiro em /register.`);
    process.exit(1);
  }
  console.log(`✅ ${email} agora é super-admin da plataforma.`);
}

main().finally(() => prisma.$disconnect());
