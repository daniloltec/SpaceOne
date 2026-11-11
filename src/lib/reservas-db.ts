import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { mensagemConflitoReserva } from "@/lib/conflito";
import { podeCancelarReserva, type Perfil } from "@/lib/permissions";
import { mensagemExterna } from "@/lib/ciclo-regras";
import { notificarReservaCancelada, notificarReservaCriada } from "@/lib/ciclo";
import { podeEncerrar, validarReserva } from "@/lib/reservas";

type Resultado = { ok: true; id: string } | { ok: false; erro: string };

export async function criarReserva(entrada: {
  perfil: Perfil | null;
  usuarioId: string | null;
  origem?: "PAINEL" | "TABLET";
  salaId: string;
  responsavelId: string;
  assunto: string;
  inicio: Date;
  fim: Date;
  qtdParticipantes: number;
  participanteIds: string[];
  agora?: Date;
}): Promise<Resultado> {
  const agora = entrada.agora ?? new Date();
  const origem = entrada.origem ?? "PAINEL";
  let responsavelId = entrada.responsavelId;

  if (origem === "PAINEL" && !entrada.usuarioId) return { ok: false, erro: "Sessão inválida." };

  if (entrada.perfil === "GESTOR" && entrada.usuarioId) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: entrada.usuarioId },
      include: { pessoa: true },
    });
    if (!usuario?.pessoa) {
      return { ok: false, erro: "Seu usuário precisa estar ligado a uma pessoa para reservar." };
    }
    responsavelId = usuario.pessoa.id;
  }

  if (!responsavelId) return { ok: false, erro: "Escolha o responsável." };

  const [sala, responsavel] = await Promise.all([
    prisma.sala.findUnique({ where: { id: entrada.salaId } }),
    prisma.pessoa.findUnique({ where: { id: responsavelId } }),
  ]);
  if (!sala) return { ok: false, erro: "Sala não encontrada." };
  if (!responsavel) return { ok: false, erro: "Responsável não encontrado." };

  const erro = validarReserva({
    inicio: entrada.inicio,
    fim: entrada.fim,
    agora,
    qtdParticipantes: entrada.qtdParticipantes,
    capacidade: sala.capacidade,
    salaAtiva: sala.ativa,
    responsavelAtivo: responsavel.ativo,
    responsavelPodeReservar: responsavel.podeReservar,
  });
  if (erro) return { ok: false, erro };

  const participanteIds = [...new Set(entrada.participanteIds.filter((id) => id && id !== responsavelId))];
  if (participanteIds.length > 0) {
    const encontrados = await prisma.pessoa.count({ where: { id: { in: participanteIds }, ativo: true } });
    if (encontrados !== participanteIds.length) {
      return { ok: false, erro: "Há um participante inativo ou inexistente." };
    }
  }

  const ocupado = await prisma.reserva.findFirst({
    where: {
      salaId: sala.id,
      status: { not: "CANCELADA" },
      inicio: { lt: entrada.fim },
      fim: { gt: entrada.inicio },
    },
    select: { id: true },
  });
  if (ocupado) return { ok: false, erro: "Esse horário já está ocupado nesta sala." };

  try {
    const reserva = await prisma.reserva.create({
      data: {
        salaId: sala.id,
        responsavelId,
        criadaPorId: origem === "TABLET" ? null : entrada.usuarioId,
        origem,
        assunto: entrada.assunto,
        inicio: entrada.inicio,
        fim: entrada.fim,
        qtdParticipantes: entrada.qtdParticipantes,
        participantes: {
          create: participanteIds.map((pessoaId) => ({ pessoaId })),
        },
      },
    });
    await registrarAuditoria({
      usuarioId: origem === "TABLET" ? null : entrada.usuarioId,
      acao: "reserva.criada",
      entidade: "Reserva",
      entidadeId: reserva.id,
      detalhes: { salaId: sala.id, inicio: entrada.inicio.toISOString() },
    });
    try {
      await notificarReservaCriada(reserva.id);
    } catch (error) {
      console.error("[reserva] aviso externo não enviado:", mensagemExterna(error));
    }
    return { ok: true, id: reserva.id };
  } catch (error) {
    const conflito = mensagemConflitoReserva(error);
    if (conflito) return { ok: false, erro: conflito };
    throw error;
  }
}

export async function cancelarReserva(entrada: {
  perfil: Perfil;
  usuarioId: string;
  reservaId: string;
  motivo?: string | null;
}): Promise<Resultado> {
  const reserva = await prisma.reserva.findUnique({ where: { id: entrada.reservaId } });
  if (!reserva) return { ok: false, erro: "Reserva não encontrada." };
  if (!podeEncerrar(reserva.status)) return { ok: false, erro: "Esta reserva não pode mais ser cancelada." };
  if (!podeCancelarReserva(entrada.perfil, reserva.criadaPorId, entrada.usuarioId)) {
    return { ok: false, erro: "Você não pode cancelar esta reserva." };
  }

  const motivo = entrada.motivo?.trim() || null;
  await prisma.reserva.update({
    where: { id: reserva.id },
    data: {
      status: "CANCELADA",
      canceladaPorId: entrada.usuarioId,
      canceladaEm: new Date(),
      motivoCancelamento: motivo,
    },
  });
  await registrarAuditoria({
    usuarioId: entrada.usuarioId,
    acao: "reserva.cancelada",
    entidade: "Reserva",
    entidadeId: reserva.id,
    detalhes: { salaId: reserva.salaId },
  });
  try {
    await notificarReservaCancelada(reserva.id);
  } catch (error) {
    console.error("[reserva] aviso de cancelamento não enviado:", mensagemExterna(error));
  }
  return { ok: true, id: reserva.id };
}
