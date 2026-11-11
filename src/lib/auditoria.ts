import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function registrarAuditoria(entrada: {
  usuarioId: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string;
  detalhes?: Prisma.InputJsonValue;
}) {
  await prisma.logAuditoria.create({
    data: {
      usuarioId: entrada.usuarioId,
      acao: entrada.acao,
      entidade: entrada.entidade,
      entidadeId: entrada.entidadeId,
      detalhes: entrada.detalhes,
    },
  });
}
