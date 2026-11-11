import { describe, expect, it } from "vitest";
import { pode, podeCancelarReserva } from "@/lib/permissions";

describe("permissões", () => {
  it("permite ao administrador gerir salas, usuários, estatísticas e integrações", () => {
    expect(pode("ADMIN", "sala.gerir")).toBe(true);
    expect(pode("ADMIN", "usuario.gerir")).toBe(true);
    expect(pode("ADMIN", "estatisticas.ver")).toBe(true);
    expect(pode("ADMIN", "integracao.gerir")).toBe(true);
    expect(pode("ADMIN", "pessoa.gerir")).toBe(true);
  });

  it("nega cadastro e estatísticas a gestor e recepção", () => {
    for (const perfil of ["GESTOR", "RECEPCAO"] as const) {
      expect(pode(perfil, "sala.gerir")).toBe(false);
      expect(pode(perfil, "usuario.gerir")).toBe(false);
      expect(pode(perfil, "estatisticas.ver")).toBe(false);
      expect(pode(perfil, "integracao.gerir")).toBe(false);
      expect(pode(perfil, "pessoa.gerir")).toBe(false);
      expect(pode(perfil, "calendario.ver")).toBe(true);
      expect(pode(perfil, "reserva.criar")).toBe(true);
    }
  });

  it("deixa o gestor cancelar só a reserva que ele criou", () => {
    expect(podeCancelarReserva("GESTOR", "user-1", "user-1")).toBe(true);
    expect(podeCancelarReserva("GESTOR", "user-2", "user-1")).toBe(false);
    expect(podeCancelarReserva("GESTOR", null, "user-1")).toBe(false);
  });

  it("deixa recepção e administrador cancelarem qualquer reserva", () => {
    expect(podeCancelarReserva("RECEPCAO", "outro", "recepcao")).toBe(true);
    expect(podeCancelarReserva("ADMIN", null, "admin")).toBe(true);
  });
});
