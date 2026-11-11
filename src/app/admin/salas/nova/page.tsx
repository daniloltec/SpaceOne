import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SalaForm } from "@/components/sala-form";
import { prisma } from "@/lib/db";
import { requireAcao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function NovaSalaPage() {
  const session = await requireAcao("sala.gerir");
  const recursos = await prisma.recurso.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });

  return (
    <AppShell email={session.user.email} perfil={session.user.perfil}>
      <Link href="/admin/salas" className="text-sm font-medium text-navy underline">
        Voltar às salas
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-navy">Nova sala</h1>
      <div className="mt-6 max-w-2xl rounded-xl border border-navy/10 bg-white p-6">
        <SalaForm recursos={recursos} />
      </div>
    </AppShell>
  );
}
