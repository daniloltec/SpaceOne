export const PERFIS = ["ADMIN", "GESTOR", "RECEPCAO"] as const;

export type Perfil = (typeof PERFIS)[number];

export const ACOES = [
  "painel.acessar",
  "calendario.ver",
  "reserva.criar",
  "reserva.cancelar.qualquer",
  "reserva.cancelar.propria",
  "sala.gerir",
  "pessoa.gerir",
  "usuario.gerir",
  "estatisticas.ver",
  "integracao.gerir",
] as const;

export type Acao = (typeof ACOES)[number];

const porPerfil: Record<Perfil, readonly Acao[]> = {
  ADMIN: ACOES,
  GESTOR: ["painel.acessar", "calendario.ver", "reserva.criar", "reserva.cancelar.propria"],
  RECEPCAO: ["painel.acessar", "calendario.ver", "reserva.criar", "reserva.cancelar.qualquer"],
};

export function isPerfil(valor: unknown): valor is Perfil {
  return typeof valor === "string" && (PERFIS as readonly string[]).includes(valor);
}

export function pode(perfil: Perfil, acao: Acao): boolean {
  return porPerfil[perfil].includes(acao);
}

export function podeCancelarReserva(
  perfil: Perfil,
  criadaPorId: string | null,
  usuarioId: string,
): boolean {
  if (pode(perfil, "reserva.cancelar.qualquer")) return true;
  if (pode(perfil, "reserva.cancelar.propria") && criadaPorId !== null && criadaPorId === usuarioId) {
    return true;
  }
  return false;
}

export function rotuloPerfil(perfil: Perfil): string {
  switch (perfil) {
    case "ADMIN":
      return "Administrador";
    case "GESTOR":
      return "Gestor";
    case "RECEPCAO":
      return "Recepção";
  }
}
