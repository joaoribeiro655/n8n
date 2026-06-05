import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@moldura.ai";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo já existe. Login: demo@moldura.ai / 123456");
    return;
  }

  const passwordHash = await bcrypt.hash("123456", 10);

  await prisma.tenant.create({
    data: {
      name: "Auto Center Premium",
      slug: "auto-center-premium",
      primaryColor: "#0ea5e9",
      secondaryColor: "#0b1220",
      accentColor: "#f59e0b",
      textColor: "#ffffff",
      fontFamily: "Poppins",
      phone: "(11) 99999-9999",
      website: "www.autocenterpremium.com.br",
      address: "Av. Brasil, 1000 — São Paulo",
      tagline: "Seu próximo carro está aqui",
      users: {
        create: { name: "João Ribeiro", email, passwordHash, role: "OWNER" },
      },
    },
  });

  console.log("✅ Seed criado. Login: demo@moldura.ai / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
