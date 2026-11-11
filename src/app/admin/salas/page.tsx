import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecursoForm } from "@/components/recurso-form";
import { botaoPrimario } from "@/components/estilos";
import { prisma } from "@/lib/db";
import { requireAcao } from "@/lib/sessao";
import { urlPublica } from "@/lib/url-publica";
import { CopiarLink } from "@/components/copiar-link";

export const dynamic = "force-dynamic";

export default async function SalasPage() {
  const session = await requireAcao("sala.gerir");
  const [salas, recursos] = await Promise.all([
    prisma.sala.findMany({
      orderBy: { nome: "asc" },
      include: { recursos: { include: { recurso: true } } },
    }),
    prisma.recurso.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const links = await Promise.all(salas.map(async (sala) => [sala.id, await urlPublica(`/tablet/${sala.tabletToken}`)] as const));
  const linkPorSala = new Map(links);

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Salas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed">
            Cada sala ganha um link exclusivo. Coloque esse endereço no tablet fixado na porta. A tela de reserva do
            tablet entra na fase seguinte; o endereço já fica pronto aqui.
          </p>
        </div>
        <Link href="/admin/salas/nova" className={botaoPrimario}>
          Nova sala
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-4">
        <h2 className="font-medium text-navy">Recursos</h2>
        <p className="mt-1 text-sm">{recursos.map((item) => item.nome).join(", ") || "Nenhum recurso ainda."}</p>
        <div className="mt-3">
          <RecursoForm />
        </div>
      </section>

      <ul className="mt-6 grid gap-4">
        {salas.length === 0 ? <li className="text-sm">Nenhuma sala cadastrada.</li> : null}
        {salas.map((sala) => (
          <li key={sala.id} className="rounded-xl border border-navy/10 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy">{sala.nome}</h2>
                <p className="mt-1 text-sm">
                  {sala.capacidade} {sala.capacidade === 1 ? "pessoa" : "pessoas"} · {sala.ativa ? "Ativa" : "Inativa"}
                </p>
                <p className="mt-1 text-sm">
                  {sala.recursos.length
                    ? sala.recursos.map((item) => `${item.recurso.nome} × ${item.quantidade}`).join(", ")
                    : "Sem recursos"}
                </p>
              </div>
              <Link href={`/admin/salas/${sala.id}`} className="text-sm font-medium text-green underline">
                Editar
              </Link>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-sm font-medium">Link do tablet</p>
              <CopiarLink url={linkPorSala.get(sala.id) ?? `/tablet/${sala.tabletToken}`} />
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
