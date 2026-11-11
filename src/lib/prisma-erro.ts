import { Prisma } from "@prisma/client";

export function mensagemUnica(error: unknown, mensagens: Record<string, string>): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const alvo = String(error.meta?.target ?? "");
  for (const [campo, mensagem] of Object.entries(mensagens)) {
    if (alvo.includes(campo)) return mensagem;
  }
  return "Já existe um registro com esse dado.";
}
