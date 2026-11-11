import { prisma } from "@/lib/db";
import { horariosLivres } from "@/lib/reservas";
import { criarReserva } from "@/lib/reservas-db";
import {
  calcularEstadoTablet,
  iniciosSugeridos,
  inicioReservavel,
  type EstadoTabletJson,
  type ReservaVista,
} from "@/lib/tablet";
import { dataIsoValida, hojeNoFuso, instanteNoFuso, limiteDoDia } from "@/lib/tempo";

function paraEvento(reserva: ReservaVista) {
  return {
    id: reserva.id,
    assunto: reserva.assunto,
    responsavel: reserva.responsavel,
    inicio: reserva.inicio.toISOString(),
    fim: reserva.fim.toISOString(),
  };
}

async function avisoMinutos(): Promise<number> {
  const config = await prisma.configuracao.findUnique({ where: { chave: "aviso_laranja_minutos_antes" } });
  const valor = Number(config?.valor);
  if (!Number.isFinite(valor) || valor < 0 || valor > 24 * 60) return 15;
  return valor;
}

export async function carregarEstadoTablet(token: string): Promise<EstadoTabletJson | null> {
  const sala = await prisma.sala.findUnique({
    where: { tabletToken: token },
    select: {
      id: true,
      nome: true,
      capacidade: true,
      ativa: true,
      recursos: {
        include: { recurso: { select: { nome: true, icone: true } } },
        orderBy: { recurso: { nome: "asc" } },
      },
    },
  });
  if (!sala) return null;

  const agora = new Date();
  const base = {
    sala: {
      nome: sala.nome,
      capacidade: sala.capacidade,
      ativa: sala.ativa,
      recursos: sala.recursos.map((item) => ({
        nome: item.recurso.nome,
        icone: item.recurso.icone,
        quantidade: item.quantidade,
      })),
    },
    agora: agora.toISOString(),
    hoje: hojeNoFuso(agora),
    avisoMinutos: await avisoMinutos(),
  };

  if (!sala.ativa) {
    return { ...base, estado: "INATIVA", atual: null, proxima: null };
  }

  const linhas = await prisma.reserva.findMany({
    where: {
      salaId: sala.id,
      status: { in: ["AGENDADA", "EM_ANDAMENTO"] },
      fim: { gt: agora },
    },
    include: { responsavel: { select: { nome: true } } },
    orderBy: { inicio: "asc" },
    take: 8,
  });
  const reservas: ReservaVista[] = linhas.map((linha) => ({
    id: linha.id,
    assunto: linha.assunto,
    responsavel: linha.responsavel.nome,
    inicio: linha.inicio,
    fim: linha.fim,
    status: linha.status,
  }));
  const calculado = calcularEstadoTablet(reservas, agora, base.avisoMinutos);
  return {
    ...base,
    estado: calculado.estado,
    atual: calculado.atual ? paraEvento(calculado.atual) : null,
    proxima: calculado.proxima ? paraEvento(calculado.proxima) : null,
  };
}

export async function horariosTablet(token: string, dataIso: string) {
  const sala = await prisma.sala.findUnique({
    where: { tabletToken: token },
    select: { id: true, ativa: true },
  });
  if (!sala?.ativa || !dataIsoValida(dataIso)) return null;

  const agora = new Date();
  const hoje = hojeNoFuso(agora);
  if (dataIso < hoje) {
    return { agora: agora.toISOString(), hoje, inicios: [] as string[], intervalos: [] as { inicio: string; fim: string }[] };
  }

  const dia = limiteDoDia(dataIso);
  let inicioJanela = dataIso === hoje ? inicioReservavel(agora) : instanteNoFuso(dataIso, "07:00");
  if (inicioJanela < dia.inicio) inicioJanela = dia.inicio;
  if (inicioJanela >= dia.fim) {
    return { agora: agora.toISOString(), hoje, inicios: [] as string[], intervalos: [] as { inicio: string; fim: string }[] };
  }

  const ocupados = await prisma.reserva.findMany({
    where: {
      salaId: sala.id,
      status: { in: ["AGENDADA", "EM_ANDAMENTO"] },
      inicio: { lt: dia.fim },
      fim: { gt: dia.inicio },
    },
    select: { inicio: true, fim: true },
  });
  const livres = horariosLivres({ inicio: inicioJanela, fim: dia.fim }, ocupados);
  return {
    agora: agora.toISOString(),
    hoje,
    inicios: iniciosSugeridos(livres).map((item) => item.toISOString()),
    intervalos: livres.map((item) => ({ inicio: item.inicio.toISOString(), fim: item.fim.toISOString() })),
  };
}

export async function reservarPeloTablet(
  token: string,
  entrada: {
    responsavelId: string;
    inicio: Date;
    fim: Date;
    qtdParticipantes: number;
    participanteIds: string[];
    assunto: string;
  },
) {
  const sala = await prisma.sala.findUnique({ where: { tabletToken: token }, select: { id: true, ativa: true } });
  if (!sala) return { ok: false as const, erro: "Sala não encontrada." };
  if (!sala.ativa) return { ok: false as const, erro: "Esta sala está desativada." };
  return criarReserva({
    perfil: null,
    usuarioId: null,
    origem: "TABLET",
    salaId: sala.id,
    responsavelId: entrada.responsavelId,
    assunto: entrada.assunto,
    inicio: entrada.inicio,
    fim: entrada.fim,
    qtdParticipantes: entrada.qtdParticipantes,
    participanteIds: entrada.participanteIds,
  });
}
