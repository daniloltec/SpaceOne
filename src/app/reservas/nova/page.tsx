import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReservaForm } from "@/components/reserva-form";
import { botaoSecundario, campoClass } from "@/components/estilos";
import { prisma } from "@/lib/db";
import { horariosLivres } from "@/lib/reservas";
import { requireAcao } from "@/lib/sessao";
import { formatInTimeZone } from "date-fns-tz";
import { FUSO_INSTALACAO, dataIsoValida, formatarHora, hojeNoFuso, limiteDoDia } from "@/lib/tempo";

export const dynamic = "force-dynamic";

function horaOu(valor: string | undefined, padrao: string) {
  return valor && /^\d{2}:\d{2}$/.test(valor) ? valor : padrao;
}

function rotuloIntervalo(inicio: Date, fim: Date): string {
  const dataInicio = formatInTimeZone(inicio, FUSO_INSTALACAO, "yyyy-MM-dd");
  const dataFim = formatInTimeZone(fim, FUSO_INSTALACAO, "yyyy-MM-dd");
  const horaFim = formatarHora(fim);
  if (horaFim === "00:00" && dataFim !== dataInicio) return `${formatarHora(inicio)} até o fim do dia`;
  if (dataFim !== dataInicio) return `${formatarHora(inicio)} até ${dataFim} ${horaFim}`;
  return `${formatarHora(inicio)}–${horaFim}`;
}

export default async function NovaReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ sala?: string; data?: string; dataFim?: string; inicio?: string; fim?: string }>;
}) {
  const session = await requireAcao("reserva.criar");
  const params = await searchParams;
  const hoje = hojeNoFuso();
  const data = params.data && dataIsoValida(params.data) ? params.data : hoje;
  const dataFim = params.dataFim && dataIsoValida(params.dataFim) ? params.dataFim : data;
  const inicio = horaOu(params.inicio, "08:00");
  const fim = horaOu(params.fim, "09:00");

  const [salas, pessoas, usuario] = await Promise.all([
    prisma.sala.findMany({ where: { ativa: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true, capacidade: true } }),
    prisma.pessoa.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true, podeReservar: true },
    }),
    prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { pessoa: { select: { id: true, nome: true, ativo: true, podeReservar: true } } },
    }),
  ]);

  const salaId = salas.some((sala) => sala.id === params.sala) ? params.sala ?? "" : salas[0]?.id ?? "";
  const gestor = session.user.perfil === "GESTOR";
  const pessoaGestor = usuario?.pessoa ?? null;
  const gestorBloqueado = gestor && (!pessoaGestor || !pessoaGestor.ativo || !pessoaGestor.podeReservar);
  const responsaveis = pessoas.filter((pessoa) => pessoa.podeReservar);

  let livres: { inicio: Date; fim: Date }[] = [];
  let ocupados: { inicio: Date; fim: Date; assunto: string }[] = [];
  if (salaId) {
    const dia = limiteDoDia(data);
    const agora = new Date();
    const inicioLivre = data === hoje && agora > dia.inicio ? agora : dia.inicio;
    ocupados = await prisma.reserva.findMany({
      where: {
        salaId,
        status: { not: "CANCELADA" },
        inicio: { lt: dia.fim },
        fim: { gt: dia.inicio },
      },
      select: { inicio: true, fim: true, assunto: true },
      orderBy: { inicio: "asc" },
    });
    if (inicioLivre < dia.fim) {
      livres = horariosLivres({ inicio: inicioLivre, fim: dia.fim }, ocupados);
    }
  }

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Nova reserva</h1>
          <p className="mt-1 text-sm">O horário é o de Fortaleza. Com a agenda da sala e o Google configurados, o Meet entra em seguida.</p>
        </div>
        <Link href="/calendario" className={botaoSecundario}>
          Ver calendário
        </Link>
      </div>

      {salas.length === 0 ? (
        <p className="rounded-xl border border-navy/10 bg-white p-4">Nenhuma sala ativa. Peça a um administrador para cadastrar uma sala.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="rounded-xl border border-navy/10 bg-white p-4">
            <form action="/reservas/nova" className="space-y-3">
              <div>
                <label htmlFor="consulta-sala" className="block text-sm font-medium">
                  Sala
                </label>
                <select id="consulta-sala" name="sala" defaultValue={salaId} className={campoClass}>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="consulta-data" className="block text-sm font-medium">
                  Dia
                </label>
                <input id="consulta-data" name="data" type="date" defaultValue={data} className={campoClass} />
              </div>
              <button type="submit" className={botaoSecundario}>
                Ver horários livres
              </button>
            </form>
            <div className="mt-4 space-y-2 text-sm">
              {ocupados.map((ocupado) => (
                <p key={`${ocupado.inicio.toISOString()}-${ocupado.assunto}`} className="rounded-md bg-danger/10 px-2 py-1">
                  Ocupado {rotuloIntervalo(ocupado.inicio, ocupado.fim)} · {ocupado.assunto}
                </p>
              ))}
              {livres.length === 0 ? <p>Não há horário livre neste dia.</p> : null}
              {livres.map((livre) => {
                const inicioLivre = formatarHora(livre.inicio);
                const fimLivre = formatarHora(livre.fim);
                const dataFinal = formatInTimeZone(livre.fim, FUSO_INSTALACAO, "yyyy-MM-dd");
                const consulta = new URLSearchParams({
                  sala: salaId,
                  data,
                  dataFim: dataFinal,
                  inicio: inicioLivre,
                  fim: fimLivre,
                });
                return (
                  <Link
                    key={`${inicioLivre}-${fimLivre}`}
                    href={`/reservas/nova?${consulta}`}
                  className="block rounded-md bg-green/10 px-2 py-1 text-navy hover:bg-green/20"
                >
                  Livre {rotuloIntervalo(livre.inicio, livre.fim)}
                </Link>
                );
              })}
            </div>
          </aside>

          {gestorBloqueado ? (
            <p className="rounded-xl border border-danger/30 bg-white p-4">
              Seu usuário precisa estar ligado a uma pessoa ativa que pode reservar.
            </p>
          ) : !gestor && responsaveis.length === 0 ? (
            <p className="rounded-xl border border-navy/10 bg-white p-4">
              Não há pessoa ativa autorizada a reservar. Cadastre uma antes de criar a reserva.
            </p>
          ) : (
            <div className="rounded-xl border border-navy/10 bg-white p-4">
              <ReservaForm
                key={`${salaId}-${data}-${dataFim}-${inicio}-${fim}`}
                salas={salas}
                responsaveis={responsaveis}
                pessoas={pessoas}
                responsavelFixo={gestor && pessoaGestor ? { id: pessoaGestor.id, nome: pessoaGestor.nome } : null}
                valores={{ salaId, data, dataFim, inicio, fim }}
              />
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
