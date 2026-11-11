const CODIGOS_CONFLITO = ["23P01", "40P01"];

export function mensagemConflitoReserva(error: unknown): string | null {
  const texto = error instanceof Error ? error.message : String(error);
  const conflito = CODIGOS_CONFLITO.some((codigo) => texto.includes(codigo)) || texto.includes("reserva_sem_conflito");
  if (conflito) return "Horário acabou de ser ocupado";
  return null;
}
