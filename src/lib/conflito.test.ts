import { describe, expect, it } from "vitest";
import { mensagemConflitoReserva } from "@/lib/conflito";

describe("conflito de reserva", () => {
  it("traduz a exclusion constraint para uma mensagem amigável", () => {
    const erro = new Error('duplicate key value violates exclusion constraint "reserva_sem_conflito" (23P01)');
    expect(mensagemConflitoReserva(erro)).toBe("Horário acabou de ser ocupado");
  });

  it("traduz o deadlock da corrida para a mesma mensagem", () => {
    expect(mensagemConflitoReserva(new Error("deadlock detected (40P01)"))).toBe("Horário acabou de ser ocupado");
  });

  it("ignora outros erros", () => {
    expect(mensagemConflitoReserva(new Error("falha de rede"))).toBeNull();
  });
});
