import { AppShell } from "@/components/app-shell";
import { botaoPrimario, campoClass } from "@/components/estilos";
import { GraficoBarras } from "@/components/grafico-barras";
import { prisma } from "@/lib/db";
import { calcularEstatisticas, diasInclusivos, rotuloDuracao } from "@/lib/estatisticas";
import { requireAcao } from "@/lib/sessao";
import { adicionarDias, dataIsoValida, hojeNoFuso, limiteDoDia } from "@/lib/tempo";

export const dynamic = "force-dynamic";

function periodoDaConsulta(de: string | undefined, ate: string | undefined) {
  const hoje = hojeNoFuso();
  return {
    de: de && dataIsoValida(de) ? de : adicionarDias(hoje, -29),
    ate: ate && dataIsoValida(ate) ? ate : hoje,
  };
}

export default async function EstatisticasPage({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const session = await requireAcao("estatisticas.ver");
  const params = await searchParams;
  const { de, ate } = periodoDaConsulta(params.de, params.ate);
  const dias = de <= ate ? diasInclusivos(de, ate) : 0;
  const aviso = de > ate ? "A data inicial precisa ser antes da final." : dias > 366 ? "O período máximo é de 366 dias." : null;
  const janela = aviso ? null : { inicio: limiteDoDia(de).inicio, fim: limiteDoDia(ate).fim, dias };

  const estatisticas = janela
    ? calcularEstatisticas(
        (
          await prisma.reserva.findMany({
            where: { status: { not: "CANCELADA" }, inicio: { lt: janela.fim }, fim: { gt: janela.inicio } },
            select: { salaId: true, inicio: true, fim: true, status: true, responsavel: { select: { id: true, nome: true } } },
          })
        ).map((reserva) => ({
          salaId: reserva.salaId,
          responsavelId: reserva.responsavel.id,
          responsavelNome: reserva.responsavel.nome,
          inicio: reserva.inicio,
          fim: reserva.fim,
          status: reserva.status,
        })),
        await prisma.sala.findMany({ select: { id: true, nome: true, ativa: true }, orderBy: { nome: "asc" } }),
        janela,
      )
    : null;

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <h1 className="text-2xl font-semibold text-navy">Estatísticas</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        O período usa o dia de Fortaleza. Reservas canceladas ficam de fora. A ocupação compara o tempo reservado com as 24 horas de cada dia, nas salas ativas.
      </p>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          De
          <input id="estatistica-de" name="de" type="date" defaultValue={de} className={campoClass} />
        </label>
        <label className="text-sm">
          Até
          <input id="estatistica-ate" name="ate" type="date" defaultValue={ate} className={campoClass} />
        </label>
        <button type="submit" className={botaoPrimario}>
          Filtrar
        </button>
      </form>
      {aviso ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {aviso}
        </p>
      ) : null}
      {estatisticas ? (
        <div className="mt-6 space-y-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-navy/10 bg-white p-4">
              <p className="text-sm">Reuniões</p>
              <p className="text-2xl font-semibold text-navy">{estatisticas.total}</p>
            </article>
            <article className="rounded-xl border border-navy/10 bg-white p-4">
              <p className="text-sm">Ocupação geral</p>
              <p className="text-2xl font-semibold text-navy">{estatisticas.ocupacaoGeral}%</p>
            </article>
            <article className="rounded-xl border border-navy/10 bg-white p-4">
              <p className="text-sm">Dias no período</p>
              <p className="text-2xl font-semibold text-navy">{dias}</p>
            </article>
          </section>

          <section className="rounded-xl border border-navy/10 bg-white p-4">
            <h2 className="font-medium text-navy">Quem mais reservou</h2>
            {estatisticas.ranking.length === 0 ? <p className="mt-2 text-sm">Nenhuma reserva neste período.</p> : null}
            <ul className="mt-2 divide-y divide-navy/10">
              {estatisticas.ranking.map((item) => (
                <li key={item.id} className="flex justify-between py-2 text-sm">
                  <span>{item.nome}</span>
                  <span>{item.quantidade}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <GraficoBarras dados={estatisticas.ranking.slice(0, 8).map((item) => ({ nome: item.nome, valor: item.quantidade }))} nome="Reservas" />
            </div>
          </section>

          <section className="rounded-xl border border-navy/10 bg-white p-4">
            <h2 className="font-medium text-navy">Salas</h2>
            <p className="mt-1 text-sm">Média de reuniões por dia e taxa de ocupação.</p>
            <ul className="mt-2 divide-y divide-navy/10">
              {estatisticas.salas.map((sala) => (
                <li key={sala.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>{sala.nome}</span>
                  <span>
                    {sala.mediaPorDia} por dia · {sala.ocupacao}%
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <GraficoBarras dados={estatisticas.salas.map((sala) => ({ nome: sala.nome, valor: sala.ocupacao }))} nome="Ocupação %" />
            </div>
          </section>

          <section className="rounded-xl border border-navy/10 bg-white p-4">
            <h2 className="font-medium text-navy">Tempo médio por responsável</h2>
            <ul className="mt-2 divide-y divide-navy/10">
              {estatisticas.duracoes.map((item) => (
                <li key={item.id} className="flex justify-between py-2 text-sm">
                  <span>{item.nome}</span>
                  <span>{rotuloDuracao(item.minutos)}</span>
                </li>
              ))}
            </ul>
            {estatisticas.duracoes.length === 0 ? <p className="mt-2 text-sm">Nenhuma reserva neste período.</p> : null}
          </section>

          <section className="rounded-xl border border-navy/10 bg-white p-4">
            <h2 className="font-medium text-navy">Horários de pico</h2>
            <p className="mt-1 text-sm">Quantas reuniões passam por cada hora, no fuso de Fortaleza.</p>
            <ul className="mt-2 divide-y divide-navy/10">
              {estatisticas.picos.map((item) => (
                <li key={item.hora} className="flex justify-between py-2 text-sm">
                  <span>{String(item.hora).padStart(2, "0")}h</span>
                  <span>{item.quantidade}</span>
                </li>
              ))}
            </ul>
            {estatisticas.picos.length === 0 ? <p className="mt-2 text-sm">Nenhuma reserva neste período.</p> : null}
            <div className="mt-4">
              <GraficoBarras
                dados={estatisticas.picos.map((item) => ({ nome: `${String(item.hora).padStart(2, "0")}h`, valor: item.quantidade }))}
                nome="Reuniões"
              />
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
