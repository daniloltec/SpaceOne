"use client";

import { useEffect, useRef, useState } from "react";
import { IconeRecurso } from "@/components/tablet-icones";
import { duracoesPossiveis, formatarContagem, type EstadoTabletJson } from "@/lib/tablet";
import { formatarHora, instanteNoFuso } from "@/lib/tempo";

type PessoaOpcao = { id: string; nome: string; podeReservar: boolean };
type Passo = "painel" | "responsavel" | "horario" | "duracao" | "detalhes" | "pronto";
type Horarios = { inicios: string[]; intervalos: { inicio: string; fim: string }[] };

const FUNDO = {
  DISPONIVEL: "bg-[#0F7A56]",
  EM_BREVE: "bg-[#C45C00]",
  EM_REUNIAO: "bg-[#B42318]",
  INATIVA: "bg-[#3F4C59]",
} as const;

const botaoGrande = "min-h-20 rounded-2xl bg-white px-4 py-4 text-2xl font-semibold text-[#173B62]";
const botaoClaro = "min-h-16 rounded-2xl border-2 border-white/70 px-4 py-3 text-xl font-semibold";

export function TabletPainel({
  token,
  inicial,
  pessoas,
}: {
  token: string;
  inicial: EstadoTabletJson;
  pessoas: PessoaOpcao[];
}) {
  const [estado, setEstado] = useState(inicial);
  const [passo, setPasso] = useState<Passo>("painel");
  const [responsavelId, setResponsavelId] = useState("");
  const [data, setData] = useState(inicial.hoje);
  const [horarios, setHorarios] = useState<Horarios>({ inicios: [], intervalos: [] });
  const [inicio, setInicio] = useState<string | null>(null);
  const [fim, setFim] = useState<string | null>(null);
  const [fimPersonalizado, setFimPersonalizado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [assunto, setAssunto] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [relogio, setRelogio] = useState(() => Date.now());
  const desvio = useRef(0);
  const buscandoFim = useRef(false);

  useEffect(() => {
    desvio.current = new Date(estado.agora).getTime() - Date.now();
  }, [estado.agora]);

  useEffect(() => {
    const id = window.setInterval(() => setRelogio(Date.now() + desvio.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let ativo = true;
    let sondagem: number | undefined;
    const aplicar = (proximo: EstadoTabletJson) => {
      if (ativo) setEstado(proximo);
    };
    const consultar = async () => {
      const resposta = await fetch(`/api/tablet/${token}/estado`);
      if (resposta.ok) aplicar((await resposta.json()) as EstadoTabletJson);
    };
    const fonte = new EventSource(`/api/tablet/${token}/eventos`);
    fonte.onmessage = (evento) => {
      aplicar(JSON.parse(evento.data) as EstadoTabletJson);
      if (sondagem) {
        window.clearInterval(sondagem);
        sondagem = undefined;
      }
    };
    fonte.onerror = () => {
      if (sondagem) return;
      void consultar();
      sondagem = window.setInterval(() => void consultar(), 15000);
    };
    return () => {
      ativo = false;
      fonte.close();
      if (sondagem) window.clearInterval(sondagem);
    };
  }, [token]);

  useEffect(() => {
    if (estado.estado !== "EM_REUNIAO" || !estado.atual || buscandoFim.current) return;
    if (relogio < new Date(estado.atual.fim).getTime()) return;
    buscandoFim.current = true;
    void fetch(`/api/tablet/${token}/estado`)
      .then(async (resposta) => {
        if (resposta.ok) setEstado((await resposta.json()) as EstadoTabletJson);
      })
      .finally(() => {
        buscandoFim.current = false;
      });
  }, [estado, relogio, token]);

  useEffect(() => {
    if (passo === "painel") return;
    let timer = window.setTimeout(() => {
      setPasso("painel");
      setErro("");
    }, 60_000);
    const reiniciar = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setPasso("painel");
        setErro("");
      }, 60_000);
    };
    window.addEventListener("pointerdown", reiniciar);
    window.addEventListener("keydown", reiniciar);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reiniciar);
      window.removeEventListener("keydown", reiniciar);
    };
  }, [passo]);

  useEffect(() => {
    let ativo = true;
    let sentinela: { release: () => Promise<void> } | null = null;
    const pedir = async () => {
      if (!ativo || !("wakeLock" in navigator)) return;
      try {
        sentinela = await navigator.wakeLock.request("screen");
      } catch {
        sentinela = null;
      }
    };
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      void sentinela?.release();
    };
  }, []);

  useEffect(() => {
    if (passo !== "pronto") return;
    const timer = window.setTimeout(() => setPasso("painel"), 4000);
    return () => window.clearTimeout(timer);
  }, [passo]);

  async function abrirHorarios(dia: string) {
    setData(dia);
    setInicio(null);
    setFim(null);
    setErro("");
    const resposta = await fetch(`/api/tablet/${token}/horarios?data=${dia}`);
    if (!resposta.ok) {
      setHorarios({ inicios: [], intervalos: [] });
      setErro("Não foi possível consultar os horários.");
      return;
    }
    const corpo = (await resposta.json()) as Horarios;
    setHorarios(corpo);
    setPasso("horario");
  }

  const responsavel = pessoas.find((pessoa) => pessoa.id === responsavelId);
  const intervalo = inicio ? horarios.intervalos.find((item) => inicio >= item.inicio && inicio < item.fim) : undefined;
  const duracoes = inicio && intervalo ? duracoesPossiveis(new Date(inicio), new Date(intervalo.fim)) : [];
  const podeReservar = pessoas.filter((pessoa) => pessoa.podeReservar);
  const fundo = FUNDO[estado.estado];

  async function confirmar() {
    if (!inicio || !fim) return;
    setEnviando(true);
    setErro("");
    const resposta = await fetch(`/api/tablet/${token}/reservas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responsavelId,
        inicio,
        fim,
        qtdParticipantes: quantidade,
        participanteIds: participantes,
        assunto,
      }),
    });
    const corpo = (await resposta.json()) as { erro?: string };
    setEnviando(false);
    if (!resposta.ok) {
      setErro(corpo.erro ?? "Não foi possível reservar.");
      return;
    }
    const atualizado = await fetch(`/api/tablet/${token}/estado`);
    if (atualizado.ok) setEstado((await atualizado.json()) as EstadoTabletJson);
    setPasso("pronto");
  }

  return (
    <main className={`flex min-h-dvh flex-col px-6 py-8 text-white select-none ${fundo}`}>
      {passo === "painel" ? (
        <Painel
          estado={estado}
          relogio={relogio}
          onReservar={() => {
            setErro("");
            setAssunto("");
            setQuantidade(1);
            setParticipantes([]);
            setResponsavelId("");
            setPasso("responsavel");
          }}
        />
      ) : null}

      {passo !== "painel" ? (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-2xl font-semibold">{estado.sala.nome}</p>
            {passo !== "pronto" ? (
              <button
                type="button"
                className={botaoClaro}
                onClick={() => {
                  if (passo === "detalhes") setPasso("duracao");
                  else if (passo === "duracao") setPasso("horario");
                  else if (passo === "horario") setPasso("responsavel");
                  else setPasso("painel");
                }}
              >
                Voltar
              </button>
            ) : null}
          </div>

          {passo === "responsavel" ? (
            <section>
              <h1 className="text-4xl font-semibold">Quem está reservando?</h1>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {podeReservar.map((pessoa) => (
                  <button
                    key={pessoa.id}
                    type="button"
                    className={botaoGrande}
                    onClick={() => {
                      setResponsavelId(pessoa.id);
                      void abrirHorarios(estado.hoje);
                    }}
                  >
                    {pessoa.nome}
                  </button>
                ))}
              </div>
              {podeReservar.length === 0 ? <p className="mt-6 text-2xl">Ninguém está autorizado a reservar.</p> : null}
            </section>
          ) : null}

          {passo === "horario" ? (
            <section>
              <h1 className="text-4xl font-semibold">Escolha o horário</h1>
              <p className="mt-2 text-xl">Responsável: {responsavel?.nome}</p>
              <label className="mt-6 block text-xl">
                Outro dia
                <input
                  type="date"
                  min={estado.hoje}
                  value={data}
                  onChange={(evento) => void abrirHorarios(evento.target.value)}
                  className="mt-2 block rounded-xl px-4 py-3 text-2xl text-[#173B62]"
                />
              </label>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                {horarios.inicios.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={botaoGrande}
                    onClick={() => {
                      setInicio(item);
                      setFim(null);
                      setFimPersonalizado("");
                      setPasso("duracao");
                    }}
                  >
                    {formatarHora(new Date(item))}
                  </button>
                ))}
              </div>
              {horarios.inicios.length === 0 ? <p className="mt-6 text-2xl">Não há horário livre neste dia.</p> : null}
            </section>
          ) : null}

          {passo === "duracao" && inicio ? (
            <section>
              <h1 className="text-4xl font-semibold">Quanto tempo?</h1>
              <p className="mt-2 text-xl">Começa às {formatarHora(new Date(inicio))}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {duracoes.map((opcao) => (
                  <button
                    key={opcao.id}
                    type="button"
                    className={botaoGrande}
                    onClick={() => {
                      setFim(opcao.fim.toISOString());
                      setPasso("detalhes");
                    }}
                  >
                    {opcao.rotulo}
                    <span className="mt-1 block text-lg font-medium">
                      até {formatarHora(opcao.fim) === "00:00" ? "o fim do dia" : formatarHora(opcao.fim)}
                    </span>
                  </button>
                ))}
              </div>
              <form
                className="mt-6 flex flex-wrap items-end gap-3"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  if (!fimPersonalizado) return;
                  const escolhido = instanteNoFuso(data, fimPersonalizado.slice(0, 5));
                  if (!intervalo || escolhido <= new Date(inicio) || escolhido > new Date(intervalo.fim)) {
                    setErro("Esse fim fica fora do horário livre.");
                    return;
                  }
                  setErro("");
                  setFim(escolhido.toISOString());
                  setPasso("detalhes");
                }}
              >
                <label className="text-xl">
                  Personalizado
                  <input
                    type="time"
                    value={fimPersonalizado}
                    onChange={(evento) => setFimPersonalizado(evento.target.value)}
                    className="mt-2 block rounded-xl px-4 py-3 text-2xl text-[#173B62]"
                  />
                </label>
                <button type="submit" className={botaoClaro}>
                  Usar este fim
                </button>
              </form>
            </section>
          ) : null}

          {passo === "detalhes" && inicio && fim ? (
            <section>
              <h1 className="text-4xl font-semibold">Confirmar</h1>
              <p className="mt-3 text-2xl">
                {responsavel?.nome} · {formatarHora(new Date(inicio))}–{formatarHora(new Date(fim))}
              </p>
              <label className="mt-6 block text-xl">
                Assunto
                <input
                  value={assunto}
                  onChange={(evento) => setAssunto(evento.target.value)}
                  maxLength={160}
                  className="mt-2 w-full rounded-xl px-4 py-3 text-2xl text-[#173B62]"
                />
              </label>
              <div className="mt-6 flex items-center gap-4">
                <button type="button" className={botaoClaro} onClick={() => setQuantidade((valor) => Math.max(1, valor - 1))}>
                  −
                </button>
                <p className="text-3xl font-semibold">{quantidade === 1 ? "1 pessoa" : `${quantidade} pessoas`}</p>
                <button
                  type="button"
                  className={botaoClaro}
                  onClick={() => setQuantidade((valor) => Math.min(estado.sala.capacidade, valor + 1))}
                >
                  +
                </button>
              </div>
              <div className="mt-6 max-h-64 space-y-2 overflow-y-auto">
                {pessoas.map((pessoa) => {
                  const marcado = participantes.includes(pessoa.id);
                  return (
                    <button
                      key={pessoa.id}
                      type="button"
                      aria-pressed={marcado}
                      className={`${botaoClaro} w-full text-left ${marcado ? "bg-white text-[#173B62]" : ""}`}
                      onClick={() =>
                        setParticipantes((atual) =>
                          atual.includes(pessoa.id) ? atual.filter((id) => id !== pessoa.id) : [...atual, pessoa.id],
                        )
                      }
                    >
                      {pessoa.nome}
                    </button>
                  );
                })}
              </div>
              <button type="button" disabled={enviando || assunto.trim().length === 0} className={`${botaoGrande} mt-6 w-full disabled:opacity-50`} onClick={() => void confirmar()}>
                {enviando ? "Reservando..." : "Confirmar reserva"}
              </button>
            </section>
          ) : null}

          {passo === "pronto" && inicio && fim ? (
            <section className="flex flex-1 flex-col items-center justify-center text-center">
              <h1 className="text-5xl font-semibold">Reserva confirmada</h1>
              <p className="mt-4 text-3xl">
                {formatarHora(new Date(inicio))}–{formatarHora(new Date(fim))}
              </p>
            </section>
          ) : null}

          {erro ? <p className="mt-4 text-2xl font-semibold">{erro}</p> : null}
        </div>
      ) : null}
    </main>
  );
}

function Painel({
  estado,
  relogio,
  onReservar,
}: {
  estado: EstadoTabletJson;
  relogio: number;
  onReservar: () => void;
}) {
  const atual = estado.atual;
  const proxima = estado.proxima;
  const restante = atual ? new Date(atual.fim).getTime() - relogio : 0;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
      {estado.estado === "INATIVA" ? (
        <>
          <p className="text-2xl font-medium uppercase tracking-wide">Indisponível</p>
          <h1 className="mt-4 text-6xl font-semibold">{estado.sala.nome}</h1>
          <p className="mt-6 text-3xl">Esta sala está desativada.</p>
        </>
      ) : null}

      {estado.estado === "EM_REUNIAO" && atual ? (
        <>
          <p className="text-2xl font-medium uppercase tracking-wide">Em reunião</p>
          <h1 className="mt-4 text-6xl font-semibold">{estado.sala.nome}</h1>
          <p className="mt-6 text-4xl">{atual.assunto}</p>
          <p className="mt-2 text-3xl">{atual.responsavel}</p>
          <p className="mt-8 font-mono text-8xl font-semibold tabular-nums">{formatarContagem(restante)}</p>
        </>
      ) : null}

      {estado.estado === "EM_BREVE" && proxima ? (
        <>
          <p className="text-2xl font-medium uppercase tracking-wide">Reunião prestes a começar</p>
          <h1 className="mt-4 text-6xl font-semibold">{estado.sala.nome}</h1>
          <p className="mt-6 text-4xl">{proxima.assunto}</p>
          <p className="mt-2 text-3xl">{proxima.responsavel}</p>
          <p className="mt-4 text-3xl">
            {formatarHora(new Date(proxima.inicio))}–{formatarHora(new Date(proxima.fim))}
          </p>
        </>
      ) : null}

      {estado.estado === "DISPONIVEL" ? (
        <>
          <h1 className="text-6xl font-semibold">{estado.sala.nome}</h1>
          <p className="mt-4 text-3xl">Capacidade: {estado.sala.capacidade}</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-6">
            {estado.sala.recursos.map((recurso) => (
              <li key={recurso.nome} className="flex flex-col items-center gap-1 text-lg">
                <IconeRecurso icone={recurso.icone} />
                <span>
                  {recurso.nome}
                  {recurso.quantidade > 1 ? ` × ${recurso.quantidade}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className={`${botaoGrande} mt-10 w-full max-w-3xl py-10 text-4xl`} onClick={onReservar}>
            Clique aqui para reservar
          </button>
        </>
      ) : null}
    </section>
  );
}
