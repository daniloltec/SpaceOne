import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { pode } from "@/lib/permissions";
import { requireAcao } from "@/lib/sessao";
import { calcularEstadoTablet, formatarContagem, type ReservaVista } from "@/lib/tablet";
import { formatarDataHora, formatarHora, hojeNoFuso } from "@/lib/tempo";

export const dynamic = "force-dynamic";

const atalhos = [
  { href: "/calendario", titulo: "Calendário", texto: "Agenda das salas.", acao: "calendario.ver" },
  { href: "/reservas/nova", titulo: "Nova reserva", texto: "Criar um horário.", acao: "reserva.criar" },
  { href: "/admin/salas", titulo: "Salas", texto: "Cadastro de salas e recursos.", acao: "sala.gerir" },
  { href: "/admin/pessoas", titulo: "Pessoas", texto: "Setores, pessoas e quem pode reservar.", acao: "pessoa.gerir" },
  { href: "/admin/usuarios", titulo: "Usuários", texto: "Quem entra no painel.", acao: "usuario.gerir" },
  { href: "/admin/estatisticas", titulo: "Estatísticas", texto: "Uso das salas.", acao: "estatisticas.ver" },
  { href: "/admin/integracoes", titulo: "Integrações", texto: "Google Agenda e o webhook público do N8N.", acao: "integracao.gerir" },
  { href: "/admin/auditoria", titulo: "Auditoria", texto: "Últimas ações gravadas.", acao: "sala.gerir" },
] as const;

const tomDaSala = {
  DISPONIVEL: "border-l-[#0F7A56]",
  EM_BREVE: "border-l-[#C45C00]",
  EM_REUNIAO: "border-l-[#B42318]",
  INATIVA: "border-l-[#3F4C59]",
} as const;

export default async function HomePage() {
  const session = await requireAcao("painel.acessar");
  const visiveis = atalhos.filter((atalho) => pode(session.user.perfil, atalho.acao));
  const agora = new Date();
  const [salas, reservas, aviso] = await Promise.all([
    prisma.sala.findMany({ orderBy: { nome: "asc" } }),
    prisma.reserva.findMany({
      where: { fim: { gt: agora }, status: { in: ["AGENDADA", "EM_ANDAMENTO"] } },
      include: { sala: true, responsavel: true },
      orderBy: { inicio: "asc" },
    }),
    prisma.configuracao.findUnique({ where: { chave: "aviso_laranja_minutos_antes" } }),
  ]);
  const avisoMinutos = Number(aviso?.valor ?? 15) || 15;
  const proximas = reservas.slice(0, 8);
  const porSala = new Map<string, ReservaVista[]>();
  for (const reserva of reservas) {
    const lista = porSala.get(reserva.salaId) ?? [];
    lista.push({
      id: reserva.id,
      assunto: reserva.assunto,
      responsavel: reserva.responsavel.nome,
      inicio: reserva.inicio,
      fim: reserva.fim,
      status: reserva.status,
    });
    porSala.set(reserva.salaId, lista);
  }

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <h1 className="text-2xl font-semibold text-navy">Painel</h1>
      <p className="mt-2 text-sm">Horário da instalação: {formatarDataHora(agora)} (America/Fortaleza)</p>
      <p className="mt-4 max-w-2xl leading-relaxed">
        Cada cartão segue a mesma regra do tablet: verde quando a sala está livre, laranja quando a próxima reunião está perto e vermelho enquanto ela acontece.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {salas.map((sala) => {
          const estado = sala.ativa
            ? calcularEstadoTablet(porSala.get(sala.id) ?? [], agora, avisoMinutos)
            : { estado: "INATIVA" as const, atual: null, proxima: null };
          const evento = estado.atual ?? (estado.estado === "EM_BREVE" ? estado.proxima : null);
          const rotulo = estado.estado === "EM_REUNIAO" ? "Ocupada" : estado.estado === "EM_BREVE" ? "Em breve" : estado.estado === "INATIVA" ? "Desativada" : "Livre";
          const detalhe = evento
            ? `${evento.responsavel} · ${estado.atual ? "resta" : "começa em"} ${formatarContagem((estado.atual ? evento.fim : evento.inicio).getTime() - agora.getTime())}`
            : estado.estado === "INATIVA"
              ? "Sala fora de uso."
              : "Nenhuma reunião agora.";
          const href = evento ? `/reservas/${evento.id}` : `/calendario?sala=${sala.id}&data=${hojeNoFuso(agora)}`;
          return (
            <li key={sala.id}>
              <Link href={href} className={`block rounded-xl border border-navy/10 border-l-4 bg-white p-4 shadow-sm hover:border-green ${tomDaSala[estado.estado]}`}>
                <span className="text-sm">{rotulo}</span>
                <span className="mt-1 block font-medium text-navy">{sala.nome}</span>
                <span className="mt-1 block text-sm">{detalhe}</span>
                {evento ? <span className="mt-1 block text-sm">{evento.assunto}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-4">
        <h2 className="font-medium text-navy">Próximas reservas</h2>
        {proximas.length === 0 ? <p className="mt-2 text-sm">Nenhuma reserva futura.</p> : null}
        <ul className="mt-2 divide-y divide-navy/10">
          {proximas.map((reserva) => (
            <li key={reserva.id}>
              <Link href={`/reservas/${reserva.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 hover:text-navy">
                <span className="font-medium">{reserva.assunto}</span>
                <span className="text-sm">
                  {reserva.sala.nome} · {formatarDataHora(reserva.inicio).slice(0, 10)} {formatarHora(reserva.inicio)}–{formatarHora(reserva.fim)} · {reserva.responsavel.nome}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {visiveis.map((atalho) => (
          <li key={atalho.href}>
            <Link href={atalho.href} className="block rounded-xl border border-navy/10 bg-white p-4 shadow-sm hover:border-green">
              <span className="font-medium text-navy">{atalho.titulo}</span>
              <span className="mt-1 block text-sm">{atalho.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
