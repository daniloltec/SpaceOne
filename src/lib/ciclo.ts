import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { emailUtil, lembreteDevido, mensagemExterna, proximoStatus } from "@/lib/ciclo-regras";
import { enviarEventoN8n, reenviarEventosN8n } from "@/lib/n8n-envio";
import { formatarDataHora } from "@/lib/tempo";

export type MensagemEmail = { para: string; assunto: string; texto: string };

export type PedidoEvento = {
  calendarId: string;
  reservaId: string;
  assunto: string;
  descricao: string;
  inicio: Date;
  fim: Date;
  emails: string[];
};

export type PortasCiclo = {
  agora: Date;
  email: {
    ativo: boolean;
    enviar: (mensagem: MensagemEmail) => Promise<void>;
  };
  google: {
    ativo: boolean;
    criar: (pedido: PedidoEvento) => Promise<{ eventId: string; meetLink: string | null }>;
    cancelar: (calendarId: string, eventId: string) => Promise<void>;
  };
};

const reservaIncluida = {
  sala: true,
  responsavel: true,
  participantes: { include: { pessoa: true } },
} as const;

type ReservaCompleta = Awaited<ReturnType<typeof carregarReserva>>;

async function carregarReserva(id: string) {
  return prisma.reserva.findUnique({ where: { id }, include: reservaIncluida });
}

async function lerMinutos(chave: string, padrao: number): Promise<number> {
  const config = await prisma.configuracao.findUnique({ where: { chave } });
  const valor = Number(config?.valor);
  if (!Number.isInteger(valor) || valor < 0 || valor > 24 * 60) return padrao;
  return valor;
}

function emailsDaReserva(reserva: NonNullable<ReservaCompleta>): string[] {
  const lista = [reserva.responsavel.email, ...reserva.participantes.map((item) => item.pessoa.email)];
  return [...new Set(lista.map((email) => email.trim()).filter(emailUtil))];
}

function descricao(reserva: NonNullable<ReservaCompleta>): string {
  return [
    `Sala: ${reserva.sala.nome}`,
    `Responsável: ${reserva.responsavel.nome}`,
    `Quando: ${formatarDataHora(reserva.inicio)} até ${formatarDataHora(reserva.fim)} (America/Fortaleza)`,
    reserva.meetLink ? `Meet: ${reserva.meetLink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function registrarFalha(reservaId: string, acao: string, erro: string) {
  const ultimo = await prisma.logAuditoria.findFirst({
    where: { entidade: "Reserva", entidadeId: reservaId, acao },
    orderBy: { criadoEm: "desc" },
  });
  const anterior =
    ultimo?.detalhes && typeof ultimo.detalhes === "object" && !Array.isArray(ultimo.detalhes) && "erro" in ultimo.detalhes
      ? String(ultimo.detalhes.erro)
      : "";
  const recente = ultimo ? Date.now() - ultimo.criadoEm.getTime() < 60 * 60 * 1000 : false;
  if (recente && anterior === erro) return;
  await registrarAuditoria({
    usuarioId: null,
    acao,
    entidade: "Reserva",
    entidadeId: reservaId,
    detalhes: { erro },
  });
}

export async function atualizarStatus(agora: Date, somenteId?: string): Promise<number> {
  const reservas = await prisma.reserva.findMany({
    where: {
      status: { in: ["AGENDADA", "EM_ANDAMENTO"] },
      inicio: { lte: agora },
      ...(somenteId ? { id: somenteId } : {}),
    },
    select: { id: true, status: true, inicio: true, fim: true },
  });
  let mudancas = 0;
  for (const reserva of reservas) {
    const proximo = proximoStatus(reserva.status, reserva.inicio, reserva.fim, agora);
    if (!proximo) continue;
    await prisma.reserva.update({ where: { id: reserva.id }, data: { status: proximo } });
    await registrarAuditoria({
      usuarioId: null,
      acao: "reserva.status",
      entidade: "Reserva",
      entidadeId: reserva.id,
      detalhes: { de: reserva.status, para: proximo },
    });
    if (proximo === "CONCLUIDA" && reserva.status === "AGENDADA") await enviarEventoN8n("reserva.iniciada", reserva.id);
    if (proximo === "EM_ANDAMENTO") await enviarEventoN8n("reserva.iniciada", reserva.id);
    if (proximo === "CONCLUIDA") await enviarEventoN8n("reserva.finalizada", reserva.id);
    mudancas += 1;
  }
  return mudancas;
}

export async function sincronizarCriacao(reservaId: string, portas: PortasCiclo): Promise<boolean> {
  if (!portas.google.ativo) return false;
  const reserva = await carregarReserva(reservaId);
  if (!reserva || reserva.googleEventId || !reserva.sala.googleCalendarId) return false;
  if (reserva.status === "CANCELADA" || reserva.status === "CONCLUIDA") return false;

  try {
    const criado = await portas.google.criar({
      calendarId: reserva.sala.googleCalendarId,
      reservaId: reserva.id,
      assunto: reserva.assunto,
      descricao: descricao(reserva),
      inicio: reserva.inicio,
      fim: reserva.fim,
      emails: emailsDaReserva(reserva),
    });
    const atual = await prisma.reserva.findUnique({ where: { id: reserva.id }, select: { status: true } });
    if (!atual || atual.status === "CANCELADA") {
      await portas.google.cancelar(reserva.sala.googleCalendarId, criado.eventId).catch(() => undefined);
      return false;
    }
    await prisma.reserva.update({
      where: { id: reserva.id },
      data: { googleEventId: criado.eventId, meetLink: criado.meetLink },
    });
    await registrarAuditoria({
      usuarioId: null,
      acao: "reserva.google_sincronizada",
      entidade: "Reserva",
      entidadeId: reserva.id,
      detalhes: { eventId: criado.eventId },
    });
    return true;
  } catch (error) {
    await registrarFalha(reserva.id, "reserva.google_erro", mensagemExterna(error));
    return false;
  }
}

export async function sincronizarCancelamento(reservaId: string, portas: PortasCiclo): Promise<boolean> {
  if (!portas.google.ativo) return false;
  const reserva = await carregarReserva(reservaId);
  if (!reserva?.googleEventId || !reserva.sala.googleCalendarId || reserva.status !== "CANCELADA") return false;
  try {
    await portas.google.cancelar(reserva.sala.googleCalendarId, reserva.googleEventId);
  } catch (error) {
    const texto = mensagemExterna(error);
    if (!texto.includes("404") && !texto.includes("410") && !texto.toLowerCase().includes("not found") && !texto.toLowerCase().includes("deleted")) {
      await registrarFalha(reserva.id, "reserva.google_erro", texto);
      return false;
    }
  }
  const eventId = reserva.googleEventId;
  await prisma.reserva.update({ where: { id: reserva.id }, data: { googleEventId: null } });
  await registrarAuditoria({
    usuarioId: null,
    acao: "reserva.google_removida",
    entidade: "Reserva",
    entidadeId: reserva.id,
    detalhes: { eventId },
  });
  return true;
}

async function auditorias(ids: string[], acoes: string[]) {
  if (ids.length === 0) return new Set<string>();
  const linhas = await prisma.logAuditoria.findMany({
    where: { entidade: "Reserva", entidadeId: { in: ids }, acao: { in: acoes } },
    select: { entidadeId: true, acao: true },
  });
  return new Set(linhas.map((linha) => `${linha.acao}:${linha.entidadeId}`));
}

export async function enviarConvitesPendentes(portas: PortasCiclo): Promise<number> {
  if (!portas.email.ativo) return 0;
  const reservas = await prisma.reserva.findMany({
    where: { status: { in: ["AGENDADA", "EM_ANDAMENTO"] }, fim: { gt: portas.agora } },
    include: reservaIncluida,
    orderBy: { inicio: "asc" },
    take: 100,
  });
  const feitas = await auditorias(
    reservas.map((reserva) => reserva.id),
    ["reserva.convite_responsavel"],
  );
  let enviados = 0;
  for (const reserva of reservas) {
    const texto = [
      `${reserva.responsavel.nome} reservou ${reserva.sala.nome}.`,
      `Assunto: ${reserva.assunto}`,
      `Quando: ${formatarDataHora(reserva.inicio)} até ${formatarDataHora(reserva.fim)} (America/Fortaleza)`,
      reserva.meetLink ? `Link da reunião: ${reserva.meetLink}` : "O link do Meet entra quando o Google Agenda concluir a sincronização.",
    ].join("\n");
    for (const participante of reserva.participantes) {
      if (participante.conviteEnviadoEm || !emailUtil(participante.pessoa.email)) continue;
      try {
        await portas.email.enviar({
          para: participante.pessoa.email,
          assunto: `Reserva: ${reserva.assunto}`,
          texto,
        });
        await prisma.participante.update({
          where: { reservaId_pessoaId: { reservaId: reserva.id, pessoaId: participante.pessoaId } },
          data: { conviteEnviadoEm: portas.agora },
        });
        enviados += 1;
      } catch (error) {
        await registrarFalha(reserva.id, "reserva.email_erro", mensagemExterna(error));
      }
    }
    const responsavelAvisado = feitas.has(`reserva.convite_responsavel:${reserva.id}`);
    const coberto = reserva.participantes.some((item) => item.pessoa.email === reserva.responsavel.email && item.conviteEnviadoEm);
    if (responsavelAvisado || coberto || !emailUtil(reserva.responsavel.email)) continue;
    try {
      await portas.email.enviar({
        para: reserva.responsavel.email,
        assunto: `Reserva: ${reserva.assunto}`,
        texto,
      });
      await registrarAuditoria({
        usuarioId: null,
        acao: "reserva.convite_responsavel",
        entidade: "Reserva",
        entidadeId: reserva.id,
      });
      enviados += 1;
    } catch (error) {
      await registrarFalha(reserva.id, "reserva.email_erro", mensagemExterna(error));
    }
  }
  return enviados;
}

export async function enviarLembretes(portas: PortasCiclo, somenteId?: string): Promise<number> {
  if (!portas.email.ativo) return 0;
  const minutos = await lerMinutos("lembrete_minutos_antes", 15);
  const limite = new Date(portas.agora.getTime() + minutos * 60 * 1000);
  const reservas = await prisma.reserva.findMany({
    where: {
      status: { in: ["AGENDADA", "EM_ANDAMENTO"] },
      inicio: { gt: portas.agora, lte: limite },
      ...(somenteId ? { id: somenteId } : {}),
    },
    include: reservaIncluida,
    orderBy: { inicio: "asc" },
    take: 100,
  });
  const feitas = await auditorias(
    reservas.map((reserva) => reserva.id),
    ["reserva.lembrete_responsavel"],
  );
  let enviados = 0;
  for (const reserva of reservas) {
    const texto = [
      `A reunião "${reserva.assunto}" em ${reserva.sala.nome} começa às ${formatarDataHora(reserva.inicio)}.`,
      `Responsável: ${reserva.responsavel.nome}`,
      reserva.meetLink ? `Link da reunião: ${reserva.meetLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    for (const participante of reserva.participantes) {
      if (!lembreteDevido(reserva.inicio, portas.agora, minutos, Boolean(participante.lembreteEnviadoEm))) continue;
      if (!emailUtil(participante.pessoa.email)) continue;
      try {
        await portas.email.enviar({
          para: participante.pessoa.email,
          assunto: `Lembrete: ${reserva.assunto}`,
          texto,
        });
        await prisma.participante.update({
          where: { reservaId_pessoaId: { reservaId: reserva.id, pessoaId: participante.pessoaId } },
          data: { lembreteEnviadoEm: portas.agora },
        });
        enviados += 1;
      } catch (error) {
        await registrarFalha(reserva.id, "reserva.email_erro", mensagemExterna(error));
      }
    }
    const jaEnviado = feitas.has(`reserva.lembrete_responsavel:${reserva.id}`);
    if (!lembreteDevido(reserva.inicio, portas.agora, minutos, jaEnviado) || !emailUtil(reserva.responsavel.email)) continue;
    try {
      await portas.email.enviar({
        para: reserva.responsavel.email,
        assunto: `Lembrete: ${reserva.assunto}`,
        texto,
      });
      await registrarAuditoria({
        usuarioId: null,
        acao: "reserva.lembrete_responsavel",
        entidade: "Reserva",
        entidadeId: reserva.id,
      });
      enviados += 1;
    } catch (error) {
      await registrarFalha(reserva.id, "reserva.email_erro", mensagemExterna(error));
    }
  }
  return enviados;
}

async function sincronizarPendentes(portas: PortasCiclo): Promise<number> {
  if (!portas.google.ativo) return 0;
  const criar = await prisma.reserva.findMany({
    where: {
      status: { in: ["AGENDADA", "EM_ANDAMENTO"] },
      googleEventId: null,
      fim: { gt: portas.agora },
      sala: { googleCalendarId: { not: null } },
    },
    select: { id: true },
    take: 50,
  });
  const cancelar = await prisma.reserva.findMany({
    where: { status: "CANCELADA", googleEventId: { not: null }, sala: { googleCalendarId: { not: null } } },
    select: { id: true },
    take: 50,
  });
  let feitos = 0;
  for (const reserva of cancelar) {
    if (await sincronizarCancelamento(reserva.id, portas)) feitos += 1;
  }
  for (const reserva of criar) {
    if (await sincronizarCriacao(reserva.id, portas)) feitos += 1;
  }
  return feitos;
}

export async function executarCiclo(portas: PortasCiclo) {
  const status = await atualizarStatus(portas.agora);
  const google = await sincronizarPendentes(portas);
  const convites = await enviarConvitesPendentes(portas);
  const lembretes = await enviarLembretes(portas);
  const n8n = await reenviarEventosN8n();
  return { status, google, convites, lembretes, n8n };
}

export async function portasDoAmbiente(agora = new Date()): Promise<PortasCiclo> {
  const emailAtivo = Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
  const googleAtivo = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() && process.env.GOOGLE_IMPERSONATE_USER?.trim());
  const email = emailAtivo ? await import("@/lib/email") : null;
  const agenda = googleAtivo ? await import("@/lib/google") : null;
  const credencial = agenda?.credencialGoogle() ?? null;
  return {
    agora,
    email: {
      ativo: Boolean(email?.smtpAtivo()),
      enviar: (mensagem) => {
        if (!email) throw new Error("SMTP não configurado");
        return email.enviarEmail(mensagem);
      },
    },
    google: {
      ativo: Boolean(credencial),
      criar: (pedido) => {
        if (!agenda || !credencial) throw new Error("Google não configurado");
        return agenda.criarEventoGoogle(credencial, pedido);
      },
      cancelar: (calendarId, eventId) => {
        if (!agenda || !credencial) throw new Error("Google não configurado");
        return agenda.cancelarEventoGoogle(credencial, calendarId, eventId);
      },
    },
  };
}

export async function notificarReservaCriada(reservaId: string) {
  const portas = await portasDoAmbiente();
  await sincronizarCriacao(reservaId, portas);
  await enviarConvitesPendentes(portas);
  await enviarEventoN8n("reserva.criada", reservaId);
}

export async function notificarReservaCancelada(reservaId: string) {
  const portas = await portasDoAmbiente();
  await sincronizarCancelamento(reservaId, portas);
  await enviarEventoN8n("reserva.cancelada", reservaId);
  if (!portas.email.ativo) return;
  const reserva = await carregarReserva(reservaId);
  if (!reserva) return;
  const texto = [
    `A reserva "${reserva.assunto}" em ${reserva.sala.nome} foi cancelada.`,
    `Quando estava marcada: ${formatarDataHora(reserva.inicio)} até ${formatarDataHora(reserva.fim)}.`,
    reserva.motivoCancelamento ? `Motivo: ${reserva.motivoCancelamento}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  for (const email of emailsDaReserva(reserva)) {
    try {
      await portas.email.enviar({ para: email, assunto: `Reserva cancelada: ${reserva.assunto}`, texto });
    } catch (error) {
      await registrarFalha(reserva.id, "reserva.email_erro", mensagemExterna(error));
    }
  }
}
