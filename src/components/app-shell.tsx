import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { pode, rotuloPerfil, type Perfil } from "@/lib/permissions";

const linksBase = [
  { href: "/", label: "Início", acao: "painel.acessar" },
  { href: "/calendario", label: "Calendário", acao: "calendario.ver" },
  { href: "/reservas/nova", label: "Nova reserva", acao: "reserva.criar" },
] as const;

const linksAdmin = [
  { href: "/admin/salas", label: "Salas", acao: "sala.gerir" },
  { href: "/admin/pessoas", label: "Pessoas", acao: "pessoa.gerir" },
  { href: "/admin/usuarios", label: "Usuários", acao: "usuario.gerir" },
  { href: "/admin/estatisticas", label: "Estatísticas", acao: "estatisticas.ver" },
  { href: "/admin/integracoes", label: "Integrações", acao: "integracao.gerir" },
  { href: "/admin/auditoria", label: "Auditoria", acao: "sala.gerir" },
] as const;

export function AppShell({
  email,
  perfil,
  children,
}: {
  email: string;
  perfil: Perfil;
  children: React.ReactNode;
}) {
  const links = [...linksBase, ...linksAdmin].filter((link) => pode(perfil, link.acao));

  return (
    <div className="min-h-screen">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">SpaceOne</p>
            <p className="text-sm text-white/80">Salas de reunião</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium">{email}</p>
              <p className="text-white/75">{rotuloPerfil(perfil)}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
