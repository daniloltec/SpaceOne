import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CancelarReserva } from "@/components/cancelar-reserva";
import { botaoSecundario } from "@/components/estilos";
import { prisma } from "@/lib/db";
import { podeCancelarReserva } from "@/lib/permissions";
import { podeEncerrar, rotuloStatus } from "@/lib/reservas";
import { requireAcao } from "@/lib/sessao";
import { formatarDataHora, hojeNoFuso } from "@/lib/tempo";

export const dynamic = "force-dynamic";

export default async function ReservaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAcao("calendario.ver");
  const { id } = await params;
  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: {
      sala: true,
      responsavel: true,
      criadaPor: { select: { email: true } },
      participantes: { include: { pessoa: true }, orderBy: { pessoa: { nome: "asc" } } },
    },
  });
  if (!reserva) notFound();

  const podeCancelar = podeEncerrar(reserva.status) && podeCancelarReserva(session.user.perfil, reserva.criadaPorId, session.user.id);
  const dia = hojeNoFuso(reserva.inicio);

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">{reserva.assunto}</h1>
        <Link href={`/calendario?visao=dia&data=${dia}&sala=${reserva.salaId}`} className={botaoSecundario}>
          Voltar ao calendário
        </Link>
      </div>
      <dl className="grid max-w-2xl gap-3 rounded-xl border border-navy/10 bg-white p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink/60">Sala</dt>
          <dd className="font-medium">{reserva.sala.nome}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Status</dt>
          <dd className="font-medium">{rotuloStatus(reserva.status)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Início</dt>
          <dd>{formatarDataHora(reserva.inicio)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Fim</dt>
          <dd>{formatarDataHora(reserva.fim)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Responsável</dt>
          <dd>{reserva.responsavel.nome}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Quantidade</dt>
          <dd>{reserva.qtdParticipantes}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Origem</dt>
          <dd>{reserva.origem === "PAINEL" ? "Painel" : "Tablet"}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Criada por</dt>
          <dd>{reserva.criadaPor?.email ?? "Tablet"}</dd>
        </div>
        {reserva.meetLink ? (
          <div className="sm:col-span-2">
            <dt className="text-sm text-ink/60">Google Meet</dt>
            <dd>
              <a href={reserva.meetLink} className="font-medium text-navy underline" target="_blank" rel="noreferrer">
                Abrir a reunião
              </a>
            </dd>
          </div>
        ) : null}
        {!reserva.meetLink && reserva.sala.googleCalendarId && reserva.status !== "CANCELADA" && reserva.status !== "CONCLUIDA" ? (
          <div className="sm:col-span-2">
            <dt className="text-sm text-ink/60">Google Meet</dt>
            <dd>O link aparece quando a agenda do Google concluir a sincronização.</dd>
          </div>
        ) : null}
      </dl>
      <section className="mt-4 max-w-2xl rounded-xl border border-navy/10 bg-white p-4">
        <h2 className="font-medium text-navy">Participantes</h2>
        {reserva.participantes.length === 0 ? <p className="mt-2 text-sm">Nenhum participante selecionado.</p> : null}
        <ul className="mt-2 space-y-1 text-sm">
          {reserva.participantes.map((item) => (
            <li key={item.pessoaId}>
              {item.pessoa.nome} · {item.pessoa.email}
            </li>
          ))}
        </ul>
        {reserva.status === "CANCELADA" ? (
          <p className="mt-4 text-sm">
            Cancelada {reserva.canceladaEm ? formatarDataHora(reserva.canceladaEm) : ""}
            {reserva.motivoCancelamento ? ` · ${reserva.motivoCancelamento}` : ""}
          </p>
        ) : null}
      </section>
      {podeCancelar ? <CancelarReserva id={reserva.id} /> : null}
    </AppShell>
  );
}
