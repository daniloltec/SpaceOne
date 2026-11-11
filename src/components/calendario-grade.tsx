import Link from "next/link";
import { corDaSala } from "@/lib/reservas";
import { adicionarDias, adicionarMeses, formatarData, formatarHora, gradeDoMes, inicioDaSemana, instanteNoFuso, limiteDoDia } from "@/lib/tempo";

export type EventoCalendario = {
  id: string;
  assunto: string;
  inicio: Date;
  fim: Date;
  salaId: string;
  salaNome: string;
  responsavel: string;
};

const VISÕES = [
  { id: "dia", rotulo: "Dia" },
  { id: "semana", rotulo: "Semana" },
  { id: "mes", rotulo: "Mês" },
] as const;

const SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function hrefCalendario(visao: string, data: string, salaId: string) {
  const consulta = new URLSearchParams({ visao, data });
  if (salaId) consulta.set("sala", salaId);
  return `/calendario?${consulta}`;
}

function hrefNova(data: string, inicio: string, salaId: string) {
  const [hora] = inicio.split(":");
  const fimHora = String(Math.min(23, Number(hora) + 1)).padStart(2, "0");
  const consulta = new URLSearchParams({ data, inicio, fim: `${fimHora}:00` });
  if (salaId) consulta.set("sala", salaId);
  return `/reservas/nova?${consulta}`;
}

function noDia(evento: EventoCalendario, dataIso: string) {
  const dia = limiteDoDia(dataIso);
  return evento.inicio < dia.fim && evento.fim > dia.inicio;
}

function EventoLink({ evento, cor }: { evento: EventoCalendario; cor: string }) {
  return (
    <Link
      href={`/reservas/${evento.id}`}
      className="block rounded px-2 py-1 text-xs text-white"
      style={{ backgroundColor: cor }}
    >
      <span className="font-medium">
        {formatarHora(evento.inicio)} {evento.salaNome}
      </span>
      <span className="block truncate">
        {evento.assunto} · {evento.responsavel}
      </span>
    </Link>
  );
}

export function CalendarioGrade({
  visao,
  data,
  salaId,
  salas,
  eventos,
  agora,
}: {
  visao: "dia" | "semana" | "mes";
  data: string;
  salaId: string;
  salas: { id: string; nome: string }[];
  eventos: EventoCalendario[];
  agora: Date;
}) {
  const anterior = visao === "mes" ? adicionarMeses(data, -1) : adicionarDias(data, visao === "semana" ? -7 : -1);
  const seguinte = visao === "mes" ? adicionarMeses(data, 1) : adicionarDias(data, visao === "semana" ? 7 : 1);
  const cor = (id: string) => corDaSala(id, salas);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {VISÕES.map((item) => (
            <Link
              key={item.id}
              href={hrefCalendario(item.id, data, salaId)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${item.id === visao ? "bg-navy text-white" : "border border-navy/20 text-navy"}`}
            >
              {item.rotulo}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={hrefCalendario(visao, anterior, salaId)} className="rounded-md border border-navy/20 px-3 py-2">
            Anterior
          </Link>
          <Link href={hrefCalendario(visao, data, salaId)} className="font-medium text-navy">
            {formatarData(limiteDoDia(data).inicio)}
          </Link>
          <Link href={hrefCalendario(visao, seguinte, salaId)} className="rounded-md border border-navy/20 px-3 py-2">
            Próximo
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={hrefCalendario(visao, data, "")}
          className={`rounded-full px-3 py-1 text-sm ${salaId ? "border border-navy/20" : "bg-navy text-white"}`}
        >
          Todas as salas
        </Link>
        {salas.map((sala) => (
          <Link
            key={sala.id}
            href={hrefCalendario(visao, data, sala.id)}
            className={`rounded-full px-3 py-1 text-sm text-white ${salaId === sala.id ? "ring-2 ring-navy ring-offset-2" : ""}`}
            style={{ backgroundColor: cor(sala.id) }}
          >
            {sala.nome}
          </Link>
        ))}
      </div>

      {visao === "dia" ? <VisaoDia data={data} salaId={salaId} salas={salas} eventos={eventos} agora={agora} cor={cor} /> : null}
      {visao === "semana" ? <VisaoSemana data={data} salaId={salaId} eventos={eventos} cor={cor} /> : null}
      {visao === "mes" ? <VisaoMes data={data} salaId={salaId} eventos={eventos} cor={cor} /> : null}
    </div>
  );
}

function VisaoDia({
  data,
  salaId,
  salas,
  eventos,
  agora,
  cor,
}: {
  data: string;
  salaId: string;
  salas: { id: string; nome: string }[];
  eventos: EventoCalendario[];
  agora: Date;
  cor: (id: string) => string;
}) {
  const horas: string[] = [];
  for (let hora = 7; hora <= 19; hora += 1) {
    const rotulo = `${String(hora).padStart(2, "0")}:00`;
    if (instanteNoFuso(data, rotulo) >= agora) horas.push(rotulo);
  }
  const salasVisiveis = salaId ? salas.filter((sala) => sala.id === salaId) : salas;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {horas.map((hora) => (
          <Link key={hora} href={hrefNova(data, hora, salaId)} className="rounded-md border border-navy/15 bg-white px-3 py-2 text-sm">
            {hora}
          </Link>
        ))}
        {horas.length === 0 ? <p className="text-sm">Este dia já passou. Escolha outro dia para reservar.</p> : null}
      </div>
      {salasVisiveis.map((sala) => {
        const daSala = eventos.filter((evento) => evento.salaId === sala.id && noDia(evento, data));
        return (
          <section key={sala.id} className="rounded-xl border border-navy/10 bg-white p-4">
            <h2 className="font-medium text-navy">{sala.nome}</h2>
            <div className="mt-3 space-y-2">
              {daSala.length === 0 ? <p className="text-sm">Nenhuma reserva neste dia.</p> : null}
              {daSala.map((evento) => (
                <EventoLink key={evento.id} evento={evento} cor={cor(evento.salaId)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function VisaoSemana({
  data,
  salaId,
  eventos,
  cor,
}: {
  data: string;
  salaId: string;
  eventos: EventoCalendario[];
  cor: (id: string) => string;
}) {
  const inicio = inicioDaSemana(data);
  const dias = Array.from({ length: 7 }, (_, indice) => adicionarDias(inicio, indice));

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-7">
      {dias.map((dia, indice) => (
        <section key={dia} className="rounded-xl border border-navy/10 bg-white p-2">
          <Link href={hrefCalendario("dia", dia, salaId)} className="text-sm font-medium text-navy">
            {SEMANA[indice]} {dia.slice(8)}
          </Link>
          <Link href={hrefNova(dia, "08:00", salaId)} className="mt-1 block text-xs text-green">
            Reservar
          </Link>
          <div className="mt-2 space-y-1">
            {eventos.filter((evento) => noDia(evento, dia)).map((evento) => (
              <EventoLink key={evento.id} evento={evento} cor={cor(evento.salaId)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function VisaoMes({
  data,
  salaId,
  eventos,
  cor,
}: {
  data: string;
  salaId: string;
  eventos: EventoCalendario[];
  cor: (id: string) => string;
}) {
  const mes = data.slice(0, 7);
  const dias = gradeDoMes(data);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink/60">
        {SEMANA.map((dia) => (
          <div key={dia}>{dia}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map((dia) => {
          const doDia = eventos.filter((evento) => noDia(evento, dia));
          return (
            <div key={dia} className={`min-h-24 rounded-md border border-navy/10 bg-white p-1 ${dia.startsWith(mes) ? "" : "opacity-50"}`}>
              <Link href={hrefCalendario("dia", dia, salaId)} className="text-xs font-medium text-navy">
                {Number(dia.slice(8))}
              </Link>
              <div className="mt-1 space-y-1">
                {doDia.slice(0, 2).map((evento) => (
                  <EventoLink key={evento.id} evento={evento} cor={cor(evento.salaId)} />
                ))}
                {doDia.length > 2 ? <p className="text-xs">+{doDia.length - 2}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
