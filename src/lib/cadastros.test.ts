import { describe, expect, it } from "vitest";
import { lerRecursos, mensagemSenha, salaSchema, usuarioSchema } from "@/lib/cadastros";

describe("cadastros", () => {
  it("aceita uma sala com capacidade e descarta texto vazio", () => {
    const sala = salaSchema.parse({
      nome: " Sala 1 ",
      descricao: "  ",
      capacidade: "8",
      ativa: true,
      googleCalendarId: "",
    });
    expect(sala.nome).toBe("Sala 1");
    expect(sala.descricao).toBeNull();
    expect(sala.capacidade).toBe(8);
    expect(sala.googleCalendarId).toBeNull();
  });

  it("exige pessoa quando o perfil é gestor", () => {
    const resultado = usuarioSchema.safeParse({
      email: "gestor@example.com",
      senha: "12345678",
      perfil: "GESTOR",
      ativo: true,
      pessoaId: "",
    });
    expect(resultado.success).toBe(false);
  });

  it("lê só os recursos marcados e limita a quantidade", () => {
    const dados = new FormData();
    dados.append("recurso", "cam");
    dados.append("quantidade-cam", "2");
    dados.append("recurso", "fora");
    dados.append("quantidade-fora", "4");
    expect(lerRecursos(dados, ["cam", "tv"])).toEqual([{ recursoId: "cam", quantidade: 2 }]);
  });

  it("pede senha de 8 caracteres só na criação", () => {
    expect(mensagemSenha("", true)).toBe("A senha precisa ter pelo menos 8 caracteres.");
    expect(mensagemSenha("", false)).toBeNull();
    expect(mensagemSenha("12345678", true)).toBeNull();
  });
});
