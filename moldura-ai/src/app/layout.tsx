import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moldura.AI — Molduras automáticas para concessionárias",
  description:
    "Plataforma multi-tenant que cria molduras de marketing com a identidade visual de cada concessionária. Arraste a foto e gere a arte.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
