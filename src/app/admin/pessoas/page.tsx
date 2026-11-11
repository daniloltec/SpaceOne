import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ConfirmarEnvio } from "@/components/confirmar-envio";
import { PessoaForm, SetorForm } from "@/components/pessoa-form";
import { excluirPessoa, excluirSetor } from "@/app/admin/pessoas/actions";
import { prisma } from "@/lib/db";
import { requireAcao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ pessoa?: string }>;
}) {
  const session = await requireAcao("pessoa.gerir");
  const { pessoa: pessoaId } = await searchParams;
  const [setores, pessoas, editando] = await Promise.all([
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
    prisma.pessoa.findMany({ orderBy: { nome: "asc" }, include: { setor: true } }),
    pessoaId ? prisma.pessoa.findUnique({ where: { id: pessoaId } }) : Promise.resolve(null),
  ]);

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <h1 className="text-2xl font-semibold text-navy">Pessoas</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        Quem pode ser escolhido como responsável no tablet precisa estar ativo e com permissão para reservar. O gestor do
        painel também usa essa pessoa.
      </p>

      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="font-medium text-navy">Setores</h2>
        <div className="mt-3">
          <SetorForm />
        </div>
        <ul className="mt-4 space-y-3">
          {setores.length === 0 ? <li className="text-sm">Nenhum setor cadastrado.</li> : null}
          {setores.map((setor) => (
            <li key={setor.id} className="flex flex-col gap-3 border-t border-navy/10 pt-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <SetorForm setor={setor} />
              </div>
              <ConfirmarEnvio
                action={excluirSetor}
                id={setor.id}
                rotulo="Excluir"
                pergunta={`Excluir o setor ${setor.nome}?`}
                perigo
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="font-medium text-navy">{editando ? "Editar pessoa" : "Nova pessoa"}</h2>
        <div className="mt-3">
          <PessoaForm
            setores={setores}
            pessoa={
              editando
                ? {
                    id: editando.id,
                    nome: editando.nome,
                    email: editando.email,
                    setorId: editando.setorId,
                    podeReservar: editando.podeReservar,
                    ativo: editando.ativo,
                  }
                : undefined
            }
          />
        </div>
      </section>

      <ul className="mt-6 space-y-3">
        {pessoas.length === 0 ? <li className="text-sm">Nenhuma pessoa cadastrada.</li> : null}
        {pessoas.map((pessoa) => (
          <li key={pessoa.id} className="rounded-xl border border-navy/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">{pessoa.nome}</h2>
                <p className="text-sm">{pessoa.email}</p>
                <p className="mt-1 text-sm">
                  {pessoa.setor?.nome ?? "Sem setor"} · {pessoa.podeReservar ? "Pode reservar" : "Não reserva"} ·{" "}
                  {pessoa.ativo ? "Ativa" : "Inativa"}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href={`/admin/pessoas?pessoa=${pessoa.id}`} className="text-sm font-medium text-green underline">
                  Editar
                </Link>
                <ConfirmarEnvio
                  action={excluirPessoa}
                  id={pessoa.id}
                  rotulo="Excluir"
                  pergunta={`Excluir ${pessoa.nome}?`}
                  perigo
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
