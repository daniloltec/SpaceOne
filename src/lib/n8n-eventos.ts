export const EVENTOS_N8N = ["reserva.criada", "reserva.cancelada", "reserva.iniciada", "reserva.finalizada"] as const;

export type EventoN8n = (typeof EVENTOS_N8N)[number];

export function eventoN8n(valor: string): valor is EventoN8n {
  return (EVENTOS_N8N as readonly string[]).includes(valor);
}
