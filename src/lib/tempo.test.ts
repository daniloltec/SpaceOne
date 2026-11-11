import { describe, expect, it } from "vitest";
import { adicionarMeses, formatarDataHora, gradeDoMes, inicioDaSemana } from "@/lib/tempo";

describe("fuso da instalação", () => {
  it("mostra o instante UTC no horário de Fortaleza", () => {
    expect(formatarDataHora(new Date("2026-11-04T15:00:00.000Z"))).toBe("04/11/2026 12:00");
  });

  it("começa a semana na segunda e limita o fim do mês", () => {
    expect(inicioDaSemana("2026-11-04")).toBe("2026-11-02");
    expect(inicioDaSemana("2026-11-08")).toBe("2026-11-02");
    expect(adicionarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(gradeDoMes("2026-11-04")[0]).toBe("2026-10-26");
  });
});
