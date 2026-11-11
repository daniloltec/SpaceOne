import type { Intervalo } from "@/lib/reservas";

export type ReservaVista = {
  id: string;
  assunto: string;
  responsavel: string;
  inicio: Date;
  fim: Date;
  status: string;
};

export type EstadoSala = "DISPONIVEL" | "EM_BREVE" | "EM_REUNIAO";

export type EventoTablet = {
  id: string;
  assunto: string;
  responsavel: string;
  inicio: string;
  fim: string;
};

export type EstadoTabletJson = {
  sala: {
    nome: string;
    capacidade: number;
    ativa: boolean;
    recursos: { nome: string; icone: string | null; quantidade: number }[];
  };
  estado: EstadoSala | "INATIVA";
  agora: string;
  hoje: string;
  avisoMinutos: number;
  atual: EventoTablet | null;
  proxima: EventoTablet | null;
};

const STATUS_VIGENTE = new Set(["AGENDADA", "EM_ANDAMENTO"]);

export function calcularEstadoTablet(
  reservas: ReservaVista[],
  agora: Date,
  avisoMinutos: number,
): { estado: EstadoSala; atual: ReservaVista | null; proxima: ReservaVista | null } {
  const vigentes = reservas.filter((reserva) => STATUS_VIGENTE.has(reserva.status));
  const atual = vigentes.find((reserva) => reserva.inicio <= agora && reserva.fim > agora) ?? null;
  const futuras = vigentes
    .filter((reserva) => reserva.inicio > agora)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const proxima = futuras[0] ?? null;
  if (atual) return { estado: "EM_REUNIAO", atual, proxima };
  const avisoMs = Math.max(0, avisoMinutos) * 60 * 1000;
  if (proxima && proxima.inicio.getTime() - agora.getTime() <= avisoMs) {
    return { estado: "EM_BREVE", atual: null, proxima };
  }
  return { estado: "DISPONIVEL", atual: null, proxima };
}

export function inicioReservavel(agora: Date, folgaMinutos = 2): Date {
  const alvo = new Date(agora.getTime() + folgaMinutos * 60 * 1000);
  alvo.setSeconds(0, 0);
  if (alvo <= agora) alvo.setMinutes(alvo.getMinutes() + 1);
  return alvo;
}

function proximaMeiaHora(data: Date): Date {
  const copia = new Date(data);
  copia.setSeconds(0, 0);
  const minutos = copia.getMinutes();
  const resto = minutos % 30;
  copia.setMinutes(minutos + (resto === 0 ? 30 : 30 - resto));
  return copia;
}

export function iniciosSugeridos(livres: Intervalo[], limite = 36): Date[] {
  const vistos = new Set<number>();
  const lista: Date[] = [];
  const adicionar = (data: Date) => {
    if (vistos.has(data.getTime()) || lista.length >= limite) return;
    vistos.add(data.getTime());
    lista.push(data);
  };

  for (const livre of livres) {
    if (livre.fim.getTime() - livre.inicio.getTime() < 30 * 60 * 1000) continue;
    adicionar(livre.inicio);
    let cursor = proximaMeiaHora(livre.inicio);
    while (cursor.getTime() + 30 * 60 * 1000 <= livre.fim.getTime()) {
      adicionar(cursor);
      cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
    }
  }
  return lista;
}

export function duracoesPossiveis(inicio: Date, limite: Date): { id: string; rotulo: string; fim: Date }[] {
  const opcoes: { id: string; rotulo: string; minutos: number | null }[] = [
    { id: "30", rotulo: "30 min", minutos: 30 },
    { id: "60", rotulo: "1 hora", minutos: 60 },
    { id: "120", rotulo: "2 horas", minutos: 120 },
    { id: "dia", rotulo: "Dia todo", minutos: null },
  ];
  const saida: { id: string; rotulo: string; fim: Date }[] = [];
  for (const opcao of opcoes) {
    const fim = opcao.minutos === null ? limite : new Date(inicio.getTime() + opcao.minutos * 60 * 1000);
    if (fim > inicio && fim <= limite) saida.push({ id: opcao.id, rotulo: opcao.rotulo, fim });
  }
  return saida;
}

export function formatarContagem(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const mm = String(minutos).padStart(2, "0");
  const ss = String(segundos).padStart(2, "0");
  if (horas > 0) return `${horas}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}
