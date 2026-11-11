import { headers } from "next/headers";

export async function urlPublica(caminho: string): Promise<string> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  const proto = cabecalhos.get("x-forwarded-proto") ?? "http";
  const base = process.env.APP_URL?.replace(/\/$/, "") || (host ? `${proto}://${host}` : "");
  return `${base}${caminho}`;
}
