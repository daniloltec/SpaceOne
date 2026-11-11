import { describe, expect, it } from "vitest";
import { horariosLivres, validarReserva } from "@/lib/reservas";
import { instanteNoFuso, limiteDoDia } from "@/lib/tempo";

const base = {
  inicio: new Date("2026-11-05T15:00:00.000Z"),
  fim: new Date("2026-11-05T16:00:00.000Z"),
  agora: new Date("2026-11-05T12:00:00.000Z"),
  qtdParticipantes: 4,
  capacidade: 8,
  salaAtiva: true,
  responsavelAtivo: true,
  responsavelPodeReservar: true,
};

describe("validação de reserva", () => {
  it("aceita uma reserva futura dentro da capacidade", () => {
    expect(validarReserva(base)).toBeNull();
  });

  it("recusa horário no passado, fim antes do início e sala cheia", () => {
    expect(validarReserva({ ...base, inicio: new Date("2026-11-05T11:00:00.000Z") })).toBe(
      "Não é possível reservar no passado.",
    );
    expect(validarReserva({ ...base, fim: base.inicio })).toBe("O horário final precisa ser depois do início.");
    expect(validarReserva({ ...base, qtdParticipantes: 9 })).toBe(
      "A quantidade de participantes passa da capacidade da sala.",
    );
    expect(validarReserva({ ...base, salaAtiva: false })).toBe("Esta sala está desativada.");
  });
});

describe("horários livres", () => {
  it("abre a faixa ocupada e mantém o resto do dia", () => {
    const dia = limiteDoDia("2026-11-05");
    const ocupado = {
      inicio: instanteNoFuso("2026-11-05", "10:00"),
      fim: instanteNoFuso("2026-11-05", "11:00"),
    };
    const livres = horariosLivres(dia, [ocupado]);
    expect(livres).toHaveLength(2);
    expect(livres[0]?.fim.toISOString()).toBe(ocupado.inicio.toISOString());
    expect(livres[1]?.inicio.toISOString()).toBe(ocupado.fim.toISOString());
  });

  it("interpreta o meio-dia de Fortaleza como 15:00 UTC", () => {
    expect(instanteNoFuso("2026-11-04", "12:00").toISOString()).toBe("2026-11-04T15:00:00.000Z");
  });
});
