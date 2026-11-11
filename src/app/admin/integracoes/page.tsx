import { AppShell } from "@/components/app-shell";
import { IntegracaoForm } from "@/components/integracao-form";
import { prisma } from "@/lib/db";
import { requireAcao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

function preenchido(nome: string): boolean {
  return Boolean(process.env[nome]?.trim());
}

export default async function IntegracoesPage() {
  const session = await requireAcao("integracao.gerir");
  const [conexao, salasComAgenda] = await Promise.all([
    prisma.integracaoN8n.findFirst({ orderBy: { atualizadoEm: "desc" } }),
    prisma.sala.count({ where: { googleCalendarId: { not: null } } }),
  ]);
  const google = preenchido("GOOGLE_SERVICE_ACCOUNT_JSON") && preenchido("GOOGLE_IMPERSONATE_USER");
  const smtp = preenchido("SMTP_HOST") && preenchido("SMTP_FROM");

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <h1 className="text-2xl font-semibold text-navy">Integrações</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        O N8N continua na sua VPS, no endereço público que ele já usa. Aqui só se cadastra a URL do webhook, o segredo e os eventos. Nenhum fluxo é criado no N8N.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-navy/10 bg-white p-4">
          <h2 className="font-medium text-navy">Google Agenda</h2>
          <p className="mt-2 text-sm">{google ? "Credenciais presentes no servidor." : "Aguardando credenciais no servidor."}</p>
          <p className="mt-1 text-sm">{salasComAgenda === 1 ? "1 sala com agenda." : `${salasComAgenda} salas com agenda.`}</p>
        </article>
        <article className="rounded-xl border border-navy/10 bg-white p-4">
          <h2 className="font-medium text-navy">E-mail</h2>
          <p className="mt-2 text-sm">{smtp ? "SMTP presente no servidor." : "Aguardando SMTP no servidor."}</p>
        </article>
      </section>

      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="font-medium text-navy">N8N</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed">
          Cole a URL pública, por exemplo <span className="font-medium">https://seu-dominio/webhook/spaceone</span> ou o IP público com a porta do webhook. O SpaceOne envia um POST com o cabeçalho <span className="font-medium">X-SpaceOne-Signature</span>, o HMAC SHA256 do corpo. Se o envio falhar, o worker tenta de novo até cinco vezes.
        </p>
        <IntegracaoForm
          webhookUrl={conexao?.webhookUrl ?? ""}
          temSegredo={Boolean(conexao?.segredo)}
          ativa={conexao?.ativa ?? false}
          eventos={conexao?.eventos ?? []}
        />
      </section>
    </AppShell>
  );
}
