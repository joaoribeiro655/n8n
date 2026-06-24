import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calendário de Conteúdo",
  description: "Planeje, gere e aprove as artes dos posts em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
