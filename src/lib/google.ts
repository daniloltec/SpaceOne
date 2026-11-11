import { readFileSync } from "node:fs";
import { google } from "googleapis";
import { formatInTimeZone } from "date-fns-tz";
import { FUSO_INSTALACAO } from "@/lib/tempo";

export type CredencialGoogle = {
  clientEmail: string;
  privateKey: string;
  impersonate: string;
};

export function credencialGoogle(env: NodeJS.ProcessEnv = process.env): CredencialGoogle | null {
  const bruto = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const impersonate = env.GOOGLE_IMPERSONATE_USER?.trim();
  if (!bruto || !impersonate) return null;
  try {
    const texto = bruto.startsWith("{") ? bruto : readFileSync(bruto, "utf8");
    const dados = JSON.parse(texto) as { client_email?: string; private_key?: string };
    if (!dados.client_email || !dados.private_key) return null;
    return { clientEmail: dados.client_email, privateKey: dados.private_key, impersonate };
  } catch {
    return null;
  }
}

export function instanteGoogle(data: Date): { dateTime: string; timeZone: "America/Fortaleza" } {
  return {
    dateTime: formatInTimeZone(data, FUSO_INSTALACAO, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    timeZone: "America/Fortaleza",
  };
}

function calendario(credencial: CredencialGoogle) {
  const auth = new google.auth.JWT({
    email: credencial.clientEmail,
    key: credencial.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
    subject: credencial.impersonate,
  });
  return google.calendar({ version: "v3", auth });
}

export async function criarEventoGoogle(
  credencial: CredencialGoogle,
  pedido: {
    calendarId: string;
    reservaId: string;
    assunto: string;
    descricao: string;
    inicio: Date;
    fim: Date;
    emails: string[];
  },
): Promise<{ eventId: string; meetLink: string | null }> {
  const resposta = await calendario(credencial).events.insert({
    calendarId: pedido.calendarId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: pedido.assunto,
      description: pedido.descricao,
      start: instanteGoogle(pedido.inicio),
      end: instanteGoogle(pedido.fim),
      attendees: pedido.emails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: pedido.reservaId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });
  const video = resposta.data.conferenceData?.entryPoints?.find((ponto) => ponto.entryPointType === "video")?.uri;
  const eventId = resposta.data.id;
  if (!eventId) throw new Error("O Google Agenda não devolveu o identificador do evento.");
  return { eventId, meetLink: video || resposta.data.hangoutLink || null };
}

export async function cancelarEventoGoogle(credencial: CredencialGoogle, calendarId: string, eventId: string): Promise<void> {
  await calendario(credencial).events.delete({
    calendarId,
    eventId,
    sendUpdates: "all",
  });
}
