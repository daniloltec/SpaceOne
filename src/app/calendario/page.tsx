import { AppShell } from "@/components/app-shell";
import { CalendarioGrade, type EventoCalendario } from "@/components/calendario-grade";
import { prisma } from "@/lib/db";
import { requireAcao } from "@/lib/sessao";
import { adicionarDias, dataIsoValida, gradeDoMes, hojeNoFuso, inicioDaSemana, limiteDoDia } from "@/lib/tempo";

export const dynamic = "force-dynamic";

function visaoValida(valor: string | undefined): "dia" | "semana" | "mes" {
  if (valor === "dia" || valor === "semana" || valor === "mes") return valor;
  return "semana";
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; data?: string; sala?: string }>;
}) {
  const session = await requireAcao("calendario.ver");
  const params = await searchParams;
  const visao = visaoValida(params.visao);
  const hoje = hojeNoFuso();
  const data = params.data && dataIsoValida(params.data) ? params.data : hoje;
  const salas = await prisma.sala.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
  const salaId = salas.some((sala) => sala.id === params.sala) ? params.sala ?? "" : "";

  const inicioGrade = visao === "mes" ? gradeDoMes(data)[0] : visao === "semana" ? inicioDaSemana(data) : data;
  const fimGrade = visao === "mes" ? adicionarDias(gradeDoMes(data).at(-1) ?? data, 1) : visao === "semana" ? adicionarDias(inicioGrade, 7) : adicionarDias(data, 1);
  const janelaInicio = limiteDoDia(inicioGrade).inicio;
  const janelaFim = limiteDoDia(fimGrade).inicio;

  const reservas = await prisma.reserva.findMany({
    where: {
      status: { not: "CANCELADA" },
      inicio: { lt: janelaFim },
      fim: { gt: janelaInicio },
      ...(salaId ? { salaId } : {}),
    },
    include: { sala: true, responsavel: true },
    orderBy: { inicio: "asc" },
  });

  const eventos: EventoCalendario[] = reservas.map((reserva) => ({
    id: reserva.id,
    assunto: reserva.assunto,
    inicio: reserva.inicio,
    fim: reserva.fim,
    salaId: reserva.salaId,
    salaNome: reserva.sala.nome,
    responsavel: reserva.responsavel.nome,
  }));

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <h1 className="text-2xl font-semibold text-navy">Calendário</h1>
      <p className="mt-1 mb-4 text-sm">Clique em um horário para reservar e em uma reserva para ver os detalhes. Canceladas ficam fora desta grade.</p>
      <CalendarioGrade visao={visao} data={data} salaId={salaId} salas={salas} eventos={eventos} agora={new Date()} />
    </AppShell>
  );
}
