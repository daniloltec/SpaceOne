import { describe, expect, it } from "vitest";
import { lembreteDevido, mensagemExterna, proximoStatus } from "@/lib/ciclo-regras";
import { credencialGoogle, instanteGoogle } from "@/lib/google";

describe("ciclo do worker", () => {
  const inicio = new Date("2026-11-06T15:00:00.000Z");
  const fim = new Date("2026-11-06T16:00:00.000Z");

  it("avança a reserva conforme o relógio", () => {
    expect(proximoStatus("AGENDADA", inicio, fim, new Date("2026-11-06T14:00:00.000Z"))).toBeNull();
    expect(proximoStatus("AGENDADA", inicio, fim, inicio)).toBe("EM_ANDAMENTO");
    expect(proximoStatus("EM_ANDAMENTO", inicio, fim, fim)).toBe("CONCLUIDA");
    expect(proximoStatus("AGENDADA", inicio, fim, fim)).toBe("CONCLUIDA");
    expect(proximoStatus("CANCELADA", inicio, fim, fim)).toBeNull();
  });

  it("libera o lembrete só dentro da janela e uma vez", () => {
    const dezMinutos = new Date(inicio.getTime() - 10 * 60 * 1000);
    const vinteMinutos = new Date(inicio.getTime() - 20 * 60 * 1000);
    expect(lembreteDevido(inicio, dezMinutos, 15, false)).toBe(true);
    expect(lembreteDevido(inicio, vinteMinutos, 15, false)).toBe(false);
    expect(lembreteDevido(inicio, dezMinutos, 15, true)).toBe(false);
    expect(lembreteDevido(inicio, inicio, 15, false)).toBe(false);
  });

  it("esconde segredo que venha na mensagem de erro", () => {
    expect(mensagemExterna(new Error("password rejected"))).toBe("falha ao contactar o serviço externo");
    expect(mensagemExterna(new Error("Not Found"))).toBe("Not Found");
  });
});

describe("credencial do Google", () => {
  it("fica inativa sem JSON ou sem usuário", () => {
    expect(credencialGoogle({ GOOGLE_SERVICE_ACCOUNT_JSON: "", GOOGLE_IMPERSONATE_USER: "" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(credencialGoogle({ GOOGLE_SERVICE_ACCOUNT_JSON: "{", GOOGLE_IMPERSONATE_USER: "a@b.c" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("lê o e-mail da conta de serviço", () => {
    const credencial = credencialGoogle({
      GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "conta@projeto.iam.gserviceaccount.com", private_key: "chave" }),
      GOOGLE_IMPERSONATE_USER: "agenda@empresa.com",
    } as unknown as NodeJS.ProcessEnv);
    expect(credencial?.clientEmail).toBe("conta@projeto.iam.gserviceaccount.com");
    expect(credencial?.impersonate).toBe("agenda@empresa.com");
  });

  it("grava o horário de Fortaleza com o deslocamento", () => {
    expect(instanteGoogle(new Date("2026-11-04T15:00:00.000Z"))).toEqual({
      dateTime: "2026-11-04T12:00:00-03:00",
      timeZone: "America/Fortaleza",
    });
  });
});
