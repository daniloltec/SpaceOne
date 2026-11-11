import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireAcao } from "@/lib/sessao";
import { formatarDataHora } from "@/lib/tempo";

export const dynamic = "force-dynamic";

function resumo(detalhes: unknown): string {
  if (!detalhes || typeof detalhes !== "object" || Array.isArray(detalhes)) return "";
  const objeto = detalhes as Record<string, unknown>;
  return ["evento", "de", "para", "erro", "webhook"]
    .flatMap((chave) => (objeto[chave] === undefined ? [] : [`${chave}: ${String(objeto[chave])}`]))
    .join(" · ")
    .slice(0, 180);
}

export default async function AuditoriaPage() {
  const session = await requireAcao("sala.gerir");
  const linhas = await prisma.logAuditoria.findMany({
    orderBy: { criadoEm: "desc" },
    take: 80,
    include: { usuario: { select: { email: true } } },
  });

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <h1 className="text-2xl font-semibold text-navy">Auditoria</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">As últimas ações gravadas no SpaceOne. O segredo do N8N não aparece aqui.</p>
      {linhas.length === 0 ? <p className="mt-6 text-sm">Nenhum registro ainda.</p> : null}
      <ul className="mt-6 divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
        {linhas.map((linha) => (
          <li key={linha.id} className="px-4 py-3 text-sm">
            <p className="font-medium text-navy">
              {linha.acao} · {linha.entidade}
            </p>
            <p className="mt-1">
              {formatarDataHora(linha.criadoEm)} · {linha.usuario?.email ?? "sistema"}
            </p>
            {resumo(linha.detalhes) ? <p className="mt-1">{resumo(linha.detalhes)}</p> : null}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
