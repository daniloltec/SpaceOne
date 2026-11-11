import { describe, expect, it } from "vitest";
import { assinarCorpo, corpoEvento, HEADER_ASSINATURA, postarWebhook, validarWebhook } from "@/lib/n8n";

const reserva = {
  id: "r1",
  assunto: "Alinhamento",
  status: "AGENDADA",
  inicio: new Date("2026-11-06T15:00:00.000Z"),
  fim: new Date("2026-11-06T15:30:00.000Z"),
  meetLink: null,
  sala: "Sala 1",
  responsavel: "Ana",
};

describe("n8n", () => {
  it("aceita o endereço público e recusa rede local", async () => {
    const resolver = async () => [{ address: "203.0.113.10" }];
    await expect(validarWebhook("http://203.0.113.10:5678/webhook/spaceone", resolver)).resolves.toBe(
      "http://203.0.113.10:5678/webhook/spaceone",
    );
    await expect(validarWebhook("https://n8n.exemplo.com/webhook/spaceone", resolver)).resolves.toBe(
      "https://n8n.exemplo.com/webhook/spaceone",
    );
    await expect(validarWebhook("http://127.0.0.1/webhook", resolver)).resolves.toBeNull();
    await expect(validarWebhook("http://10.1.1.5/webhook", resolver)).resolves.toBeNull();
    await expect(validarWebhook("http://192.168.0.8:5678/webhook", resolver)).resolves.toBeNull();
    await expect(validarWebhook("http://localhost/webhook", resolver)).resolves.toBeNull();
    await expect(validarWebhook("http://user:segredo@203.0.113.10/webhook", resolver)).resolves.toBeNull();
    await expect(validarWebhook("https://interno.exemplo", async () => [{ address: "10.0.0.4" }])).resolves.toBeNull();
  });

  it("assina o corpo e recusa redirecionamento", async () => {
    const corpo = corpoEvento("reserva.criada", reserva, new Date("2026-11-06T13:00:00.000Z"));
    const vistos: { url: string; assinatura: string }[] = [];
    await postarWebhook("http://203.0.113.10/webhook/spaceone", "segredo-de-teste", corpo, async (url, init) => {
      const headers = new Headers(init?.headers);
      vistos.push({ url: String(url), assinatura: headers.get(HEADER_ASSINATURA) ?? "" });
      return new Response(null, { status: 200 });
    });
    expect(vistos[0]?.assinatura).toBe(assinarCorpo("segredo-de-teste", corpo));
    expect(vistos[0]?.url).toBe("http://203.0.113.10/webhook/spaceone");
    expect(corpo.includes("segredo")).toBe(false);

    await expect(
      postarWebhook("http://203.0.113.10/webhook/spaceone", "segredo-de-teste", corpo, async () => new Response(null, { status: 302 })),
    ).rejects.toThrow("redirecionamento recusado");
  });
});
