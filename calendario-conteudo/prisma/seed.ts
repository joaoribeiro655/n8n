import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Cliente de demonstração.
  const tenant = await prisma.tenant.upsert({
    where: { slug: "copa" },
    update: {},
    create: {
      slug: "copa",
      name: "Copa",
      tagline: "Conteúdo planejado e aprovado em um só lugar",
    },
  });

  const email = "admin@copa.com";
  const passwordHash = await bcrypt.hash("mudar123", 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Administrador",
      passwordHash,
      role: "OWNER",
      tenantId: tenant.id,
    },
  });

  console.log("✓ Seed pronto.");
  console.log(`  Cliente: ${tenant.name} (${tenant.slug})`);
  console.log(`  Login:   ${email} / mudar123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
