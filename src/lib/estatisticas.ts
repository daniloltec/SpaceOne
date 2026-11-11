import { adicionarDias, FUSO_INSTALACAO, instanteNoFuso } from "@/lib/tempo";
import { formatInTimeZone } from "date-fns-tz";

export type ReservaParaEstatistica = {
  salaId: string;
  responsavelId: string;
  responsavelNome: string;
  inicio: Date;
  fim: Date;
  status: string;
};

export type SalaParaEstatistica = {
  id: string;
  nome: string;
  ativa: boolean;
};

export type PeriodoEstatistica = {
  inicio: Date;
  fim: Date;
  dias: number;
};

export type RankingItem = { id: string; nome: string; quantidade: number };
export type SalaMetrica = { id: string; nome: string; quantidade: number; mediaPorDia: number; ocupacao: number };
export type DuracaoItem = { id: string; nome: string; minutos: number; quantidade: number };
export type PicoItem = { hora: number; quantidade: number };

export type Estatisticas = {
  total: number;
  ocupacaoGeral: number;
  ranking: RankingItem[];
  salas: SalaMetrica[];
  duracoes: DuracaoItem[];
  picos: PicoItem[];
};

const MINUTOS_DIA = 24 * 60;

export function diasInclusivos(de: string, ate: string): number {
  let dias = 1;
  for (let cursor = de; cursor < ate && dias <= 400; cursor = adicionarDias(cursor, 1)) dias += 1;
  return dias;
}

export function minutosSobrepostos(inicio: Date, fim: Date, periodoInicio: Date, periodoFim: Date): number {
  const a = Math.max(inicio.getTime(), periodoInicio.getTime());
  const b = Math.min(fim.getTime(), periodoFim.getTime());
  if (b <= a) return 0;
  return (b - a) / 60000;
}

export function horasDePico(inicio: Date, fim: Date, periodoInicio: Date, periodoFim: Date): number[] {
  const a = new Date(Math.max(inicio.getTime(), periodoInicio.getTime()));
  const b = new Date(Math.min(fim.getTime(), periodoFim.getTime()));
  const horas: number[] = [];
  let cursor = a;
  let guard = 0;
  while (cursor < b && guard < 24 * 40) {
    const marca = formatInTimeZone(cursor, FUSO_INSTALACAO, "yyyy-MM-dd HH");
    const [dia, horaTexto] = marca.split(" ");
    const hora = Number(horaTexto);
    horas.push(hora);
    cursor = hora === 23 ? instanteNoFuso(adicionarDias(dia, 1), "00:00") : instanteNoFuso(dia, `${String(hora + 1).padStart(2, "0")}:00`);
    guard += 1;
  }
  return horas;
}

function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export function calcularEstatisticas(
  reservas: ReservaParaEstatistica[],
  salas: SalaParaEstatistica[],
  periodo: PeriodoEstatistica,
): Estatisticas {
  const consideradas = reservas.filter(
    (reserva) => reserva.status !== "CANCELADA" && minutosSobrepostos(reserva.inicio, reserva.fim, periodo.inicio, periodo.fim) > 0,
  );
  const porPessoa = new Map<string, { nome: string; quantidade: number; minutos: number }>();
  const porSala = new Map<string, { quantidade: number; minutos: number }>();
  const porHora = new Map<number, number>();

  for (const reserva of consideradas) {
    const minutos = minutosSobrepostos(reserva.inicio, reserva.fim, periodo.inicio, periodo.fim);
    const pessoa = porPessoa.get(reserva.responsavelId) ?? { nome: reserva.responsavelNome, quantidade: 0, minutos: 0 };
    pessoa.quantidade += 1;
    pessoa.minutos += minutos;
    porPessoa.set(reserva.responsavelId, pessoa);

    const sala = porSala.get(reserva.salaId) ?? { quantidade: 0, minutos: 0 };
    sala.quantidade += 1;
    sala.minutos += minutos;
    porSala.set(reserva.salaId, sala);

    for (const hora of horasDePico(reserva.inicio, reserva.fim, periodo.inicio, periodo.fim)) {
      porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
    }
  }

  const minutosDisponiveis = periodo.dias * MINUTOS_DIA;
  const salasOrdenadas = [...salas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const metricas: SalaMetrica[] = salasOrdenadas.map((sala) => {
    const uso = porSala.get(sala.id) ?? { quantidade: 0, minutos: 0 };
    const ocupacao = minutosDisponiveis === 0 ? 0 : Math.min(100, (uso.minutos / minutosDisponiveis) * 100);
    return {
      id: sala.id,
      nome: sala.nome,
      quantidade: uso.quantidade,
      mediaPorDia: periodo.dias === 0 ? 0 : arredondar(uso.quantidade / periodo.dias),
      ocupacao: arredondar(ocupacao),
    };
  });

  const ativas = salas.filter((sala) => sala.ativa);
  const minutosAtivos = ativas.reduce((soma, sala) => soma + (porSala.get(sala.id)?.minutos ?? 0), 0);
  const capacidade = ativas.length * minutosDisponiveis;
  const ocupacaoGeral = capacidade === 0 ? 0 : arredondar(Math.min(100, (minutosAtivos / capacidade) * 100));

  const ranking = [...porPessoa.entries()]
    .map(([id, item]) => ({ id, nome: item.nome, quantidade: item.quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));

  const duracoes = [...porPessoa.entries()]
    .map(([id, item]) => ({
      id,
      nome: item.nome,
      quantidade: item.quantidade,
      minutos: item.quantidade === 0 ? 0 : arredondar(item.minutos / item.quantidade),
    }))
    .sort((a, b) => b.minutos - a.minutos || a.nome.localeCompare(b.nome, "pt-BR"));

  const picos = [...porHora.entries()]
    .map(([hora, quantidade]) => ({ hora, quantidade }))
    .sort((a, b) => a.hora - b.hora);

  return { total: consideradas.length, ocupacaoGeral, ranking, salas: metricas, duracoes, picos };
}

export function rotuloDuracao(minutos: number): string {
  const total = Math.round(minutos);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}
