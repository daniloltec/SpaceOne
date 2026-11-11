import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  const texto = readFileSync(".env", "utf8");
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha.startsWith("DATABASE_URL=")) continue;
    process.env.DATABASE_URL = linha.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
  }
}

const sufixo = `fase3-${Date.now()}`;
const futuro = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
futuro.setUTCMinutes(0, 0, 0);
const fim = new Date(futuro.getTime() + 60 * 60 * 1000);

let prisma: PrismaClient;
let pessoaId = "";
let outraPessoaId = "";
let usuarioId = "";
let outroUsuarioId = "";
let salaA = "";
let salaB = "";
let disponivel = false;

describe("reservas no banco", () => {
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

    const senhaHash = await bcrypt.hash("teste-fase3", 4);
    const pessoa = await prisma.pessoa.create({
      data: { nome: `Resp ${sufixo}`, email: `resp-${sufixo}@example.com`, podeReservar: true },
    });
    pessoaId = pessoa.id;
    const outra = await prisma.pessoa.create({
      data: { nome: `Outra ${sufixo}`, email: `outra-${sufixo}@example.com`, podeReservar: true },
    });
    outraPessoaId = outra.id;
    const usuario = await prisma.usuario.create({
      data: { email: `gestor-${sufixo}@example.com`, senhaHash, perfil: "GESTOR", pessoaId: pessoa.id },
    });
    usuarioId = usuario.id;
    const outro = await prisma.usuario.create({
      data: { email: `gestor2-${sufixo}@example.com`, senhaHash, perfil: "GESTOR", pessoaId: outra.id },
    });
    outroUsuarioId = outro.id;
    const salas = await Promise.all([
      prisma.sala.create({ data: { nome: `Sala A ${sufixo}`, capacidade: 4 } }),
      prisma.sala.create({ data: { nome: `Sala B ${sufixo}`, capacidade: 4 } }),
    ]);
    salaA = salas[0].id;
    salaB = salas[1].id;
  });

  afterAll(async () => {
    if (!disponivel || !prisma) return;
    const usuarios = [usuarioId, outroUsuarioId].filter(Boolean);
    await prisma.logAuditoria.deleteMany({ where: { usuarioId: { in: usuarios } } });
    await prisma.reserva.deleteMany({ where: { salaId: { in: [salaA, salaB].filter(Boolean) } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await prisma.sala.deleteMany({ where: { id: { in: [salaA, salaB].filter(Boolean) } } });
    await prisma.pessoa.deleteMany({ where: { id: { in: [pessoaId, outraPessoaId].filter(Boolean) } } });
    await prisma.$disconnect();
  });

  it("aceita o mesmo horário em salas diferentes e recusa a sobreposição", async () => {
    if (!disponivel) throw new Error("PostgreSQL indisponível para o teste de reservas.");
    const { criarReserva, cancelarReserva } = await import("@/lib/reservas-db");
    const primeira = await criarReserva({
      perfil: "ADMIN",
      usuarioId,
      salaId: salaA,
      responsavelId: pessoaId,
      assunto: "Sala A",
      inicio: futuro,
      fim,
      qtdParticipantes: 2,
      participanteIds: [outraPessoaId],
    });
    const outraSala = await criarReserva({
      perfil: "ADMIN",
      usuarioId,
      salaId: salaB,
      responsavelId: pessoaId,
      assunto: "Sala B",
      inicio: futuro,
      fim,
      qtdParticipantes: 2,
      participanteIds: [],
    });
    const conflito = await criarReserva({
      perfil: "ADMIN",
      usuarioId,
      salaId: salaA,
      responsavelId: pessoaId,
      assunto: "Conflito",
      inicio: futuro,
      fim,
      qtdParticipantes: 1,
      participanteIds: [],
    });
    const passado = await criarReserva({
      perfil: "ADMIN",
      usuarioId,
      salaId: salaB,
      responsavelId: pessoaId,
      assunto: "Passado",
      inicio: new Date("2020-01-01T15:00:00.000Z"),
      fim: new Date("2020-01-01T16:00:00.000Z"),
      qtdParticipantes: 1,
      participanteIds: [],
    });

    expect(primeira.ok).toBe(true);
    expect(outraSala.ok).toBe(true);
    expect(conflito).toEqual({ ok: false, erro: "Esse horário já está ocupado nesta sala." });
    expect(passado).toEqual({ ok: false, erro: "Não é possível reservar no passado." });

    const corridaInicio = new Date(futuro.getTime() + 3 * 60 * 60 * 1000);
    const corridaFim = new Date(corridaInicio.getTime() + 30 * 60 * 1000);
    const [uma, duas] = await Promise.all([
      criarReserva({
        perfil: "ADMIN",
        usuarioId,
        salaId: salaA,
        responsavelId: pessoaId,
        assunto: "Corrida 1",
        inicio: corridaInicio,
        fim: corridaFim,
        qtdParticipantes: 1,
        participanteIds: [],
      }),
      criarReserva({
        perfil: "ADMIN",
        usuarioId,
        salaId: salaA,
        responsavelId: pessoaId,
        assunto: "Corrida 2",
        inicio: corridaInicio,
        fim: corridaFim,
        qtdParticipantes: 1,
        participanteIds: [],
      }),
    ]);
    const ganhadoras = [uma, duas].filter((item) => item.ok);
    const perdidas = [uma, duas].filter((item) => !item.ok);
    expect(ganhadoras).toHaveLength(1);
    expect(perdidas).toHaveLength(1);
    if (!perdidas[0]?.ok) {
      expect(["Esse horário já está ocupado nesta sala.", "Horário acabou de ser ocupado"]).toContain(perdidas[0]?.erro);
    }
    const gravadas = await prisma.reserva.count({
      where: { salaId: salaA, inicio: corridaInicio, status: { not: "CANCELADA" } },
    });
    expect(gravadas).toBe(1);

    if (!primeira.ok) return;
    const alheia = await cancelarReserva({
      perfil: "GESTOR",
      usuarioId: outroUsuarioId,
      reservaId: primeira.id,
    });
    const propria = await cancelarReserva({
      perfil: "GESTOR",
      usuarioId,
      reservaId: primeira.id,
      motivo: "Teste",
    });
    expect(alheia).toEqual({ ok: false, erro: "Você não pode cancelar esta reserva." });
    expect(propria.ok).toBe(true);
    const cancelada = await prisma.reserva.findUnique({ where: { id: primeira.id } });
    expect(cancelada?.status).toBe("CANCELADA");

    const pelaPorta = await criarReserva({
      perfil: null,
      usuarioId: null,
      origem: "TABLET",
      salaId: salaB,
      responsavelId: pessoaId,
      assunto: "Pela porta",
      inicio: new Date(futuro.getTime() + 5 * 60 * 60 * 1000),
      fim: new Date(futuro.getTime() + 6 * 60 * 60 * 1000),
      qtdParticipantes: 1,
      participanteIds: [],
    });
    expect(pelaPorta.ok).toBe(true);
    if (pelaPorta.ok) {
      const gravada = await prisma.reserva.findUnique({ where: { id: pelaPorta.id } });
      expect(gravada?.origem).toBe("TABLET");
      expect(gravada?.criadaPorId).toBeNull();
      const gestorNaoCancela = await cancelarReserva({
        perfil: "GESTOR",
        usuarioId,
        reservaId: pelaPorta.id,
      });
      expect(gestorNaoCancela).toEqual({ ok: false, erro: "Você não pode cancelar esta reserva." });
    }
  }, 20_000);
});
