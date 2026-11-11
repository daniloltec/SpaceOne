import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const FUSO_INSTALACAO = "America/Fortaleza";

export function formatarDataHora(data: Date, fuso = FUSO_INSTALACAO): string {
  return formatInTimeZone(data, fuso, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatarData(data: Date, fuso = FUSO_INSTALACAO): string {
  return formatInTimeZone(data, fuso, "dd/MM/yyyy", { locale: ptBR });
}

export function formatarHora(data: Date, fuso = FUSO_INSTALACAO): string {
  return formatInTimeZone(data, fuso, "HH:mm", { locale: ptBR });
}

export function hojeNoFuso(agora = new Date(), fuso = FUSO_INSTALACAO): string {
  return formatInTimeZone(agora, fuso, "yyyy-MM-dd");
}

export function dataIsoValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function adicionarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function adicionarMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  const diaFinal = Math.min(dia, ultimo);
  return new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), diaFinal)).toISOString().slice(0, 10);
}

export function inicioDaSemana(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const weekday = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return adicionarDias(dataIso, delta);
}

export function gradeDoMes(dataIso: string): string[] {
  const mes = dataIso.slice(0, 7);
  const [ano, mesNum] = mes.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
  const ultimo = `${mes}-${String(ultimoDia).padStart(2, "0")}`;
  const inicio = inicioDaSemana(`${mes}-01`);
  const fim = adicionarDias(inicioDaSemana(ultimo), 6);
  const dias: string[] = [];
  for (let cursor = inicio; cursor <= fim; cursor = adicionarDias(cursor, 1)) dias.push(cursor);
  return dias;
}

export function instanteNoFuso(dataIso: string, hora: string, fuso = FUSO_INSTALACAO): Date {
  return fromZonedTime(`${dataIso}T${hora}:00`, fuso);
}

export function limiteDoDia(dataIso: string, fuso = FUSO_INSTALACAO): { inicio: Date; fim: Date } {
  return {
    inicio: fromZonedTime(`${dataIso}T00:00:00`, fuso),
    fim: fromZonedTime(`${adicionarDias(dataIso, 1)}T00:00:00`, fuso),
  };
}
