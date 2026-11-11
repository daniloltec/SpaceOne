export type Intervalo = { inicio: Date; fim: Date };

export type ValidacaoReserva = {
  inicio: Date;
  fim: Date;
  agora: Date;
  qtdParticipantes: number;
  capacidade: number;
  salaAtiva: boolean;
  responsavelAtivo: boolean;
  responsavelPodeReservar: boolean;
};

const PALETA = ["#173B62", "#159B78", "#C47B12", "#8B3A4A", "#2F5D8C", "#0F766E"];

export function validarReserva(dados: ValidacaoReserva): string | null {
  if (!dados.salaAtiva) return "Esta sala está desativada.";
  if (!dados.responsavelAtivo || !dados.responsavelPodeReservar) {
    return "O responsável precisa estar ativo e autorizado a reservar.";
  }
  if (!(dados.fim > dados.inicio)) return "O horário final precisa ser depois do início.";
  if (dados.inicio < dados.agora) return "Não é possível reservar no passado.";
  if (!Number.isInteger(dados.qtdParticipantes) || dados.qtdParticipantes < 1) {
    return "Informe a quantidade de participantes.";
  }
  if (dados.qtdParticipantes > dados.capacidade) {
    return "A quantidade de participantes passa da capacidade da sala.";
  }
  return null;
}

export function horariosLivres(dia: Intervalo, ocupados: Intervalo[]): Intervalo[] {
  const recortes = ocupados
    .filter((ocupado) => ocupado.fim > dia.inicio && ocupado.inicio < dia.fim)
    .map((ocupado) => ({
      inicio: ocupado.inicio < dia.inicio ? dia.inicio : ocupado.inicio,
      fim: ocupado.fim > dia.fim ? dia.fim : ocupado.fim,
    }))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const livres: Intervalo[] = [];
  let cursor = dia.inicio;
  for (const ocupado of recortes) {
    if (ocupado.inicio > cursor) livres.push({ inicio: cursor, fim: ocupado.inicio });
    if (ocupado.fim > cursor) cursor = ocupado.fim;
  }
  if (cursor < dia.fim) livres.push({ inicio: cursor, fim: dia.fim });
  return livres;
}

export function corDaSala(salaId: string, salasOrdenadas: readonly { id: string }[]): string {
  const indice = salasOrdenadas.findIndex((sala) => sala.id === salaId);
  return PALETA[(indice < 0 ? 0 : indice) % PALETA.length];
}

export function rotuloStatus(status: string): string {
  switch (status) {
    case "AGENDADA":
      return "Agendada";
    case "EM_ANDAMENTO":
      return "Em andamento";
    case "CONCLUIDA":
      return "Concluída";
    case "CANCELADA":
      return "Cancelada";
    default:
      return status;
  }
}

export function podeEncerrar(status: string): boolean {
  return status === "AGENDADA" || status === "EM_ANDAMENTO";
}
