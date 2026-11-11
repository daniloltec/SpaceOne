import { notFound } from "next/navigation";
import { TabletPainel } from "@/components/tablet-painel";
import { prisma } from "@/lib/db";
import { carregarEstadoTablet } from "@/lib/tablet-db";

export const dynamic = "force-dynamic";

export default async function TabletPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estado = await carregarEstadoTablet(token);
  if (!estado) notFound();

  const pessoas = estado.sala.ativa
    ? await prisma.pessoa.findMany({
        where: { ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, podeReservar: true },
      })
    : [];

  return <TabletPainel token={token} inicial={estado} pessoas={pessoas} />;
}
