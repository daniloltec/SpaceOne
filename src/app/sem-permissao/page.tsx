import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function SemPermissaoPage() {
  const session = await requireUser();

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <section className="rounded-xl border border-danger/30 bg-white p-6">
        <h1 className="text-2xl font-semibold text-danger">Sem permissão</h1>
        <p className="mt-3 max-w-xl">Seu perfil não pode abrir esta área. O bloqueio vale para a página e para a API.</p>
        <Link href="/" className="mt-6 inline-block font-medium text-navy underline">
          Voltar ao início
        </Link>
      </section>
    </AppShell>
  );
}
