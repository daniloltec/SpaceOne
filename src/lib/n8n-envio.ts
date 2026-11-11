import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { mensagemExterna } from "@/lib/ciclo-regras";
import { corpoEvento, postarWebhook, TENTATIVAS_N8N, validarWebhook, type EventoN8n } from "@/lib/n8n";
import { eventoN8n } from "@/lib/n8n-eventos";

async function conexaoAtiva() {
  const linha = await prisma.integracaoN8n.findFirst({ orderBy: { atualizadoEm: "desc" } });
  if (!linha?.ativa || !linha.webhookUrl || !linha.segredo) return null;
  const url = await validarWebhook(linha.webhookUrl);
  if (!url) return null;
  const eventos = linha.eventos.filter(eventoN8n);
  return { url, segredo: linha.segredo, eventos };
}

async function marcado(reservaId: string, acao: "n8n.enviado" | "n8n.pendente" | "n8n.erro", evento: EventoN8n) {
  return prisma.logAuditoria.count({
    where: {
      entidade: "Reserva",
      entidadeId: reservaId,
      acao,
      detalhes: { path: ["evento"], equals: evento },
    },
  });
}

export async function enviarEventoN8n(evento: EventoN8n, reservaId: string): Promise<boolean> {
  try {
    const conexao = await conexaoAtiva();
    if (!conexao || !conexao.eventos.includes(evento)) return false;
    if ((await marcado(reservaId, "n8n.enviado", evento)) > 0) return false;
    if ((await marcado(reservaId, "n8n.erro", evento)) >= TENTATIVAS_N8N) return false;

    const reserva = await prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { sala: true, responsavel: true },
    });
    if (!reserva) return false;
    if ((await marcado(reservaId, "n8n.pendente", evento)) === 0) {
      await registrarAuditoria({
        usuarioId: null,
        acao: "n8n.pendente",
        entidade: "Reserva",
        entidadeId: reservaId,
        detalhes: { evento },
      });
    }

    const corpo = corpoEvento(
      evento,
      {
        id: reserva.id,
        assunto: reserva.assunto,
        status: reserva.status,
        inicio: reserva.inicio,
        fim: reserva.fim,
        meetLink: reserva.meetLink,
        sala: reserva.sala.nome,
        responsavel: reserva.responsavel.nome,
      },
      new Date(),
    );
    await postarWebhook(conexao.url, conexao.segredo, corpo);
    await registrarAuditoria({
      usuarioId: null,
      acao: "n8n.enviado",
      entidade: "Reserva",
      entidadeId: reservaId,
      detalhes: { evento },
    });
    return true;
  } catch (error) {
    await registrarAuditoria({
      usuarioId: null,
      acao: "n8n.erro",
      entidade: "Reserva",
      entidadeId: reservaId,
      detalhes: { evento, erro: mensagemExterna(error) },
    }).catch(() => undefined);
    return false;
  }
}

export async function reenviarEventosN8n(): Promise<number> {
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pendentes = await prisma.logAuditoria.findMany({
    where: { acao: "n8n.pendente", entidade: "Reserva", criadoEm: { gt: desde } },
    orderBy: { criadoEm: "desc" },
    take: 50,
    select: { entidadeId: true, detalhes: true },
  });
  let enviados = 0;
  const vistos = new Set<string>();
  for (const linha of pendentes) {
    if (!linha.entidadeId || !linha.detalhes || typeof linha.detalhes !== "object" || Array.isArray(linha.detalhes)) continue;
    const evento = "evento" in linha.detalhes ? String(linha.detalhes.evento) : "";
    if (!eventoN8n(evento)) continue;
    const chave = `${linha.entidadeId}:${evento}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    if (await enviarEventoN8n(evento, linha.entidadeId)) enviados += 1;
  }
  return enviados;
}
