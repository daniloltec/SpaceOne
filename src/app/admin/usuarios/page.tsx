import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ConfirmarEnvio } from "@/components/confirmar-envio";
import { UsuarioForm } from "@/components/usuario-form";
import { excluirUsuario } from "@/app/admin/usuarios/actions";
import { prisma } from "@/lib/db";
import { rotuloPerfil } from "@/lib/permissions";
import { requireAcao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>;
}) {
  const session = await requireAcao("usuario.gerir");
  const { usuario: usuarioId } = await searchParams;
  const [usuarios, editando, pessoasLivres] = await Promise.all([
    prisma.usuario.findMany({ orderBy: { email: "asc" }, include: { pessoa: true } }),
    usuarioId ? prisma.usuario.findUnique({ where: { id: usuarioId } }) : Promise.resolve(null),
    prisma.pessoa.findMany({
      where: {
        OR: [{ usuario: null }, ...(usuarioId ? [{ usuario: { id: usuarioId } }] : [])],
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true },
    }),
  ]);

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <h1 className="text-2xl font-semibold text-navy">Usuários</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        Administrador, gestor e recepção entram neste painel. O gestor precisa estar ligado a uma pessoa, porque a reserva
        fica no nome dele.
      </p>

      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="font-medium text-navy">{editando ? "Editar usuário" : "Novo usuário"}</h2>
        <div className="mt-3">
          <UsuarioForm
            pessoas={pessoasLivres}
            usuario={
              editando
                ? {
                    id: editando.id,
                    email: editando.email,
                    perfil: editando.perfil,
                    ativo: editando.ativo,
                    pessoaId: editando.pessoaId,
                  }
                : undefined
            }
          />
        </div>
      </section>

      <ul className="mt-6 space-y-3">
        {usuarios.map((usuario) => (
          <li key={usuario.id} className="rounded-xl border border-navy/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">{usuario.email}</h2>
                <p className="mt-1 text-sm">
                  {rotuloPerfil(usuario.perfil)} · {usuario.ativo ? "Ativo" : "Inativo"}
                  {usuario.pessoa ? ` · ${usuario.pessoa.nome}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href={`/admin/usuarios?usuario=${usuario.id}`} className="text-sm font-medium text-green underline">
                  Editar
                </Link>
                {usuario.id !== session.user.id ? (
                  <ConfirmarEnvio
                    action={excluirUsuario}
                    id={usuario.id}
                    rotulo="Excluir"
                    pergunta={`Excluir o usuário ${usuario.email}?`}
                    perigo
                  />
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
