import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { PortasCiclo } from "@/lib/ciclo";

if (!process.env.DATABASE_URL) {
  const texto = readFileSync(".env", "utf8");
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha.startsWith("DATABASE_URL=")) continue;
    process.env.DATABASE_URL = linha.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
  }
}

const sufixo = `fase5-${Date.now()}`;
let prisma: PrismaClient;
let disponivel = false;
let pessoaId = "";
let participanteId = "";
let salaId = "";
let reservaId = "";

describe("ciclo no banco", () => {
  beforeAll(async () => {
    const banco = await import("@/lib/db");
    prisma = banco.prisma;
    try {
      await prisma.$queryRaw`SELECT 1`;
      disponivel = true;
    } catch {
      disponivel = false;
      return;
    }
    const pessoa = await prisma.pessoa.create({
      data: { nome: `Resp ${sufixo}`, email: `resp-${sufixo}@example.com`, podeReservar: true },
    });
    pessoaId = pessoa.id;
    const participante = await prisma.pessoa.create({
      data: { nome: `Part ${sufixo}`, email: `part-${sufixo}@example.com` },
    });
    participanteId = participante.id;
    const sala = await prisma.sala.create({
      data: { nome: `Sala ${sufixo}`, capacidade: 4, googleCalendarId: `agenda-${sufixo}` },
    });
    salaId = sala.id;
  });

  afterAll(async () => {
    if (!disponivel || !prisma) return;
    if (reservaId) await prisma.logAuditoria.deleteMany({ where: { entidadeId: reservaId } });
    if (salaId) await prisma.reserva.deleteMany({ where: { salaId } });
    if (salaId) await prisma.sala.deleteMany({ where: { id: salaId } });
    await prisma.pessoa.deleteMany({ where: { id: { in: [pessoaId, participanteId].filter(Boolean) } } });
    await prisma.$disconnect();
  });

  it("atualiza o status, grava o Meet falso e marca o lembrete", async () => {
    if (!disponivel) throw new Error("PostgreSQL indisponível para o teste do ciclo.");
    const { atualizarStatus, enviarLembretes, sincronizarCancelamento, sincronizarCriacao } = await import("@/lib/ciclo");
    const inicio = new Date(Date.now() + 10 * 60 * 1000);
    const fim = new Date(inicio.getTime() + 30 * 60 * 1000);
    const reserva = await prisma.reserva.create({
      data: {
        salaId,
        responsavelId: pessoaId,
        origem: "TABLET",
        assunto: `Ciclo ${sufixo}`,
        inicio,
        fim,
        qtdParticipantes: 2,
        participantes: { create: [{ pessoaId: participanteId }] },
      },
    });
    reservaId = reserva.id;

    const portas: PortasCiclo = {
      agora: new Date(inicio.getTime() - 5 * 60 * 1000),
      email: {
        ativo: true,
        enviar: async (mensagem) => {
          enviados.push(mensagem.para);
        },
      },
      google: {
        ativo: true,
        criar: async () => ({ eventId: "evt-teste", meetLink: "https://meet.google.com/abc-defg-hij" }),
        cancelar: async () => {
          cancelou = true;
        },
      },
    };
    const enviados: string[] = [];
    let cancelou = false;

    expect(await sincronizarCriacao(reserva.id, portas)).toBe(true);
    const sincronizada = await prisma.reserva.findUnique({ where: { id: reserva.id } });
    expect(sincronizada?.googleEventId).toBe("evt-teste");
    expect(sincronizada?.meetLink).toBe("https://meet.google.com/abc-defg-hij");

    expect(await enviarLembretes(portas, reserva.id)).toBe(2);
    expect(enviados.sort()).toEqual([`part-${sufixo}@example.com`, `resp-${sufixo}@example.com`].sort());
    const participante = await prisma.participante.findUnique({
      where: { reservaId_pessoaId: { reservaId: reserva.id, pessoaId: participanteId } },
    });
    expect(participante?.lembreteEnviadoEm).toBeTruthy();
    expect(await enviarLembretes(portas, reserva.id)).toBe(0);

    expect(await atualizarStatus(new Date(inicio.getTime() + 5 * 60 * 1000), reserva.id)).toBe(1);
    expect((await prisma.reserva.findUnique({ where: { id: reserva.id } }))?.status).toBe("EM_ANDAMENTO");
    expect(await atualizarStatus(new Date(fim.getTime() + 60 * 1000), reserva.id)).toBe(1);
    expect((await prisma.reserva.findUnique({ where: { id: reserva.id } }))?.status).toBe("CONCLUIDA");

    await prisma.reserva.update({ where: { id: reserva.id }, data: { status: "CANCELADA" } });
    expect(await sincronizarCancelamento(reserva.id, portas)).toBe(true);
    expect(cancelou).toBe(true);
    expect((await prisma.reserva.findUnique({ where: { id: reserva.id } }))?.googleEventId).toBeNull();
  });
});
