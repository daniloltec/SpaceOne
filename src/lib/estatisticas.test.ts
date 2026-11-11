import { describe, expect, it } from "vitest";
import { calcularEstatisticas, horasDePico, minutosSobrepostos, rotuloDuracao } from "@/lib/estatisticas";
import { limiteDoDia } from "@/lib/tempo";

const dia = limiteDoDia("2026-11-06");
const salas = [
  { id: "s1", nome: "Sala 1", ativa: true },
  { id: "s2", nome: "Sala 2", ativa: true },
];

describe("estatisticas", () => {
  it("ignora cancelada e conta o recorte do período", () => {
    const resultado = calcularEstatisticas(
      [
        {
          salaId: "s1",
          responsavelId: "p1",
          responsavelNome: "Ana",
          inicio: new Date("2026-11-06T15:00:00.000Z"),
          fim: new Date("2026-11-06T16:00:00.000Z"),
          status: "CONCLUIDA",
        },
        {
          salaId: "s1",
          responsavelId: "p1",
          responsavelNome: "Ana",
          inicio: new Date("2026-11-06T17:00:00.000Z"),
          fim: new Date("2026-11-06T17:30:00.000Z"),
          status: "CANCELADA",
        },
        {
          salaId: "s2",
          responsavelId: "p2",
          responsavelNome: "Bruno",
          inicio: new Date("2026-11-06T02:30:00.000Z"),
          fim: new Date("2026-11-06T04:00:00.000Z"),
          status: "CONCLUIDA",
        },
      ],
      salas,
      { inicio: dia.inicio, fim: dia.fim, dias: 1 },
    );

    expect(resultado.total).toBe(2);
    expect(resultado.ranking[0]).toMatchObject({ nome: "Ana", quantidade: 1 });
    expect(resultado.salas.find((sala) => sala.id === "s1")).toMatchObject({ quantidade: 1, mediaPorDia: 1 });
    expect(resultado.salas.find((sala) => sala.id === "s2")?.quantidade).toBe(1);
    const ana = resultado.duracoes.find((item) => item.nome === "Ana");
    expect(ana?.minutos).toBe(60);
    const bruno = resultado.duracoes.find((item) => item.nome === "Bruno");
    expect(bruno?.minutos).toBe(60);
    expect(minutosSobrepostos(new Date("2026-11-06T02:30:00.000Z"), new Date("2026-11-06T04:00:00.000Z"), dia.inicio, dia.fim)).toBe(60);
  });

  it("marca o horário de pico no fuso de Fortaleza", () => {
    const horas = horasDePico(
      new Date("2026-11-06T15:30:00.000Z"),
      new Date("2026-11-06T16:10:00.000Z"),
      dia.inicio,
      dia.fim,
    );
    expect(horas).toEqual([12, 13]);
  });

  it("resume a duração em horas e minutos", () => {
    expect(rotuloDuracao(45)).toBe("45 min");
    expect(rotuloDuracao(60)).toBe("1 h");
    expect(rotuloDuracao(90)).toBe("1 h 30 min");
  });
});
