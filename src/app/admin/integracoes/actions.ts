"use server";

import { unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { eventoN8n, validarWebhook } from "@/lib/n8n";
import { requireAcao } from "@/lib/sessao";

export type EstadoIntegracao = { erro: string; ok: string };

export async function salvarIntegracao(_estado: EstadoIntegracao, formData: FormData): Promise<EstadoIntegracao> {
  try {
    const session = await requireAcao("integracao.gerir");
    const atual = await prisma.integracaoN8n.findFirst({ orderBy: { atualizadoEm: "desc" } });
    const informado = String(formData.get("segredo") ?? "").trim();
    const segredo = informado || atual?.segredo || "";
    if (segredo.length < 8) return { erro: "O segredo precisa ter pelo menos 8 caracteres.", ok: "" };

    const url = await validarWebhook(String(formData.get("webhookUrl") ?? ""));
    if (!url) {
      return {
        erro: "Use o endereço público do webhook, com http ou https. Endereços locais não são aceitos.",
        ok: "",
      };
    }
    const eventos = formData.getAll("eventos").map(String).filter(eventoN8n);
    if (eventos.length === 0) return { erro: "Escolha ao menos um evento.", ok: "" };
    const ativa = formData.get("ativa") === "on";

    const dados = { ativa, webhookUrl: url, segredo, eventos };
    const gravada = atual
      ? await prisma.integracaoN8n.update({ where: { id: atual.id }, data: dados })
      : await prisma.integracaoN8n.create({ data: dados });
    await registrarAuditoria({
      usuarioId: session.user.id,
      acao: "integracao.n8n",
      entidade: "IntegracaoN8n",
      entidadeId: gravada.id,
      detalhes: { ativa, eventos, webhook: new URL(url).host },
    });
    return { erro: "", ok: "Conexão guardada." };
  } catch (error) {
    unstable_rethrow(error);
    return { erro: "Não foi possível guardar a conexão.", ok: "" };
  }
}
