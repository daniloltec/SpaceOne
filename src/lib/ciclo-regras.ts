export function proximoStatus(
  status: string,
  inicio: Date,
  fim: Date,
  agora: Date,
): "EM_ANDAMENTO" | "CONCLUIDA" | null {
  if (status !== "AGENDADA" && status !== "EM_ANDAMENTO") return null;
  if (fim <= agora) return "CONCLUIDA";
  if (status === "AGENDADA" && inicio <= agora) return "EM_ANDAMENTO";
  return null;
}

export function lembreteDevido(inicio: Date, agora: Date, minutos: number, jaEnviado: boolean): boolean {
  if (jaEnviado || minutos < 0) return false;
  if (agora >= inicio) return false;
  return inicio.getTime() - agora.getTime() <= minutos * 60 * 1000;
}

export function emailUtil(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

export function mensagemExterna(error: unknown): string {
  const texto = error instanceof Error ? error.message : "falha ao contactar o serviço externo";
  const baixo = texto.toLowerCase();
  if (
    baixo.includes("private key") ||
    baixo.includes("begin private") ||
    baixo.includes("password") ||
    baixo.includes("smtp_pass") ||
    baixo.includes("postgresql://")
  ) {
    return "falha ao contactar o serviço externo";
  }
  return texto.slice(0, 300);
}
