import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { EventoN8n } from "@/lib/n8n-eventos";

export { EVENTOS_N8N, eventoN8n, type EventoN8n } from "@/lib/n8n-eventos";

export const HEADER_ASSINATURA = "x-spaceone-signature";
export const TENTATIVAS_N8N = 5;

export type ReservaEvento = {
  id: string;
  assunto: string;
  status: string;
  inicio: Date;
  fim: Date;
  meetLink: string | null;
  sala: string;
  responsavel: string;
};

type Resolvedor = (host: string) => Promise<{ address: string }[]>;

export function assinarCorpo(segredo: string, corpo: string): string {
  return createHmac("sha256", segredo).update(corpo).digest("hex");
}

export function corpoEvento(evento: EventoN8n, reserva: ReservaEvento, enviadoEm: Date): string {
  return JSON.stringify({
    evento,
    enviadoEm: enviadoEm.toISOString(),
    reserva: {
      id: reserva.id,
      assunto: reserva.assunto,
      status: reserva.status,
      inicio: reserva.inicio.toISOString(),
      fim: reserva.fim.toISOString(),
      meetLink: reserva.meetLink,
      sala: reserva.sala,
      responsavel: reserva.responsavel,
    },
  });
}

export function ipProibido(endereco: string): boolean {
  const host = endereco.replace(/^\[|\]$/g, "").toLowerCase();
  const tipo = isIP(host);
  if (tipo === 4) {
    const partes = host.split(".").map(Number);
    const [a, b] = partes;
    if (partes.some((parte) => !Number.isInteger(parte) || parte < 0 || parte > 255)) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (tipo === 6) {
    if (host === "::" || host === "::1") return true;
    if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
    if (host.startsWith("::ffff:")) return ipProibido(host.slice("::ffff:".length));
    return false;
  }
  return false;
}

export async function validarWebhook(valor: string, resolver: Resolvedor = resolverPadrao): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (isIP(host)) return ipProibido(host) ? null : url.toString();
  try {
    const encontrados = await resolver(host);
    if (encontrados.length === 0 || encontrados.some((item) => ipProibido(item.address))) return null;
  } catch {
    return null;
  }
  return url.toString();
}

async function resolverPadrao(host: string): Promise<{ address: string }[]> {
  return lookup(host, { all: true, verbatim: true });
}

export async function postarWebhook(
  url: string,
  segredo: string,
  corpo: string,
  post: typeof fetch = fetch,
): Promise<void> {
  const resposta = await post(url, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      [HEADER_ASSINATURA]: assinarCorpo(segredo, corpo),
    },
    body: corpo,
    signal: AbortSignal.timeout(8000),
  });
  if (resposta.status >= 300 && resposta.status < 400) throw new Error("redirecionamento recusado");
  if (!resposta.ok) throw new Error(`webhook respondeu ${resposta.status}`);
}
