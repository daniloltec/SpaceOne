import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpaceOne",
  description: "Controle de salas de reunião",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
