import { describe, expect, it } from "vitest";
import { calcularEstadoTablet, duracoesPossiveis, formatarContagem, iniciosSugeridos, inicioReservavel } from "@/lib/tablet";

const agora = new Date("2026-11-06T15:00:00.000Z");

function reserva(inicio: string, fim: string, status = "AGENDADA") {
  return {
    id: inicio,
    assunto: "Reunião",
    responsavel: "Ana",
    inicio: new Date(inicio),
    fim: new Date(fim),
    status,
  };
}

describe("estado do tablet", () => {
  it("fica verde sem reunião por perto", () => {
    const resultado = calcularEstadoTablet([reserva("2026-11-06T16:00:00.000Z", "2026-11-06T17:00:00.000Z")], agora, 15);
    expect(resultado.estado).toBe("DISPONIVEL");
  });

  it("fica laranja dentro da janela de aviso e ignora cancelada", () => {
    const resultado = calcularEstadoTablet(
      [
        reserva("2026-11-06T15:10:00.000Z", "2026-11-06T16:00:00.000Z"),
        reserva("2026-11-06T15:05:00.000Z", "2026-11-06T15:20:00.000Z", "CANCELADA"),
      ],
      agora,
      15,
    );
    expect(resultado.estado).toBe("EM_BREVE");
    expect(resultado.proxima?.inicio.toISOString()).toBe("2026-11-06T15:10:00.000Z");
  });

  it("fica vermelho durante a reunião, mesmo com o status ainda agendado", () => {
    const resultado = calcularEstadoTablet([reserva("2026-11-06T14:30:00.000Z", "2026-11-06T15:30:00.000Z")], agora, 15);
    expect(resultado.estado).toBe("EM_REUNIAO");
    expect(resultado.atual?.fim.toISOString()).toBe("2026-11-06T15:30:00.000Z");
  });
});

describe("horários do tablet", () => {
  it("oferece o começo da faixa e os inícios de meia hora com pelo menos 30 minutos", () => {
    const inicios = iniciosSugeridos([
      { inicio: new Date("2026-11-06T12:27:00.000Z"), fim: new Date("2026-11-06T14:00:00.000Z") },
    ]);
    expect(inicios.map((item) => item.toISOString())).toEqual([
      "2026-11-06T12:27:00.000Z",
      "2026-11-06T12:30:00.000Z",
      "2026-11-06T13:00:00.000Z",
      "2026-11-06T13:30:00.000Z",
    ]);
  });

  it("monta 30 min, 1 hora e o resto da faixa", () => {
    const inicio = new Date("2026-11-06T12:00:00.000Z");
    const limite = new Date("2026-11-06T13:00:00.000Z");
    expect(duracoesPossiveis(inicio, limite).map((item) => item.id)).toEqual(["30", "60", "dia"]);
  });

  it("deixa uma folga para a pessoa concluir o toque", () => {
    expect(inicioReservavel(new Date("2026-11-06T12:27:40.000Z")).toISOString()).toBe("2026-11-06T12:29:00.000Z");
  });

  it("formata a contagem regressiva", () => {
    expect(formatarContagem(30 * 60 * 1000)).toBe("30:00");
    expect(formatarContagem(90 * 60 * 1000)).toBe("1:30:00");
    expect(formatarContagem(0)).toBe("00:00");
  });
});
