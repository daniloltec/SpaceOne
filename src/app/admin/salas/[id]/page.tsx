import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConfirmarEnvio } from "@/components/confirmar-envio";
import { CopiarLink } from "@/components/copiar-link";
import { SalaForm } from "@/components/sala-form";
import { alternarSala, excluirSala, renovarLinkTablet } from "@/app/admin/salas/actions";
import { prisma } from "@/lib/db";
import { requireAcao } from "@/lib/sessao";
import { urlPublica } from "@/lib/url-publica";

export const dynamic = "force-dynamic";

export default async function EditarSalaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAcao("sala.gerir");
  const { id } = await params;
  const [sala, recursos] = await Promise.all([
    prisma.sala.findUnique({
      where: { id },
      include: { recursos: true },
    }),
    prisma.recurso.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  if (!sala) notFound();

  const link = await urlPublica(`/tablet/${sala.tabletToken}`);

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <Link href="/admin/salas" className="text-sm font-medium text-navy underline">
        Voltar às salas
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-navy">{sala.nome}</h1>
      <section className="mt-6 max-w-2xl rounded-xl border border-navy/10 bg-white p-6">
        <h2 className="font-medium text-navy">Link do tablet</h2>
        <p className="mt-1 text-sm leading-relaxed">
          Abra este endereço no tablet da porta. Ele mostra só esta sala. Gerar um novo link invalida o endereço antigo.
        </p>
        <div className="mt-3">
          <CopiarLink url={link} />
        </div>
        <div className="mt-3">
          <ConfirmarEnvio
            action={renovarLinkTablet}
            id={sala.id}
            rotulo="Gerar novo link"
            pergunta="O tablet atual vai parar de abrir esta sala. Gerar um novo link?"
          />
        </div>
      </section>
      <div className="mt-6 max-w-2xl rounded-xl border border-navy/10 bg-white p-6">
        <SalaForm
          recursos={recursos}
          sala={{
            id: sala.id,
            nome: sala.nome,
            descricao: sala.descricao ?? "",
            capacidade: sala.capacidade,
            ativa: sala.ativa,
            googleCalendarId: sala.googleCalendarId ?? "",
            fotoUrl: sala.fotoUrl,
            recursos: sala.recursos.map((item) => ({ recursoId: item.recursoId, quantidade: item.quantidade })),
          }}
        />
      </div>
      <div className="mt-4 flex max-w-2xl flex-wrap gap-3">
        <ConfirmarEnvio
          action={alternarSala}
          id={sala.id}
          rotulo={sala.ativa ? "Desativar sala" : "Ativar sala"}
          pergunta={sala.ativa ? "Desativar esta sala?" : "Ativar esta sala?"}
        />
        <ConfirmarEnvio
          action={excluirSala}
          id={sala.id}
          rotulo="Excluir sala"
          pergunta="Excluir esta sala? Só é possível se ela não tiver reservas."
          perigo
        />
      </div>
    </AppShell>
  );
}
