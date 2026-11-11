"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { marcado, pessoaSchema, setorSchema } from "@/lib/cadastros";
import { mensagemUnica } from "@/lib/prisma-erro";
import { requireAcao } from "@/lib/sessao";

type Estado = { erro: string };

export async function salvarSetor(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("pessoa.gerir");
  const id = String(formData.get("id") ?? "");
  const parsed = setorSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    if (id) {
      await prisma.setor.update({ where: { id }, data: parsed.data });
      await registrarAuditoria({
        usuarioId: session.user.id,
        acao: "setor.editado",
        entidade: "Setor",
        entidadeId: id,
        detalhes: { nome: parsed.data.nome },
      });
    } else {
      const setor = await prisma.setor.create({ data: parsed.data });
      await registrarAuditoria({
        usuarioId: session.user.id,
        acao: "setor.criado",
        entidade: "Setor",
        entidadeId: setor.id,
        detalhes: { nome: setor.nome },
      });
    }
  } catch (error) {
    unstable_rethrow(error);
    const unica = mensagemUnica(error, { nome: "Já existe um setor com esse nome." });
    if (unica) return { erro: unica };
    throw error;
  }
  redirect("/admin/pessoas");
}

export async function excluirSetor(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("pessoa.gerir");
  const id = String(formData.get("id") ?? "");
  const setor = await prisma.setor.findUnique({ where: { id }, include: { _count: { select: { pessoas: true } } } });
  if (!setor) return { erro: "Setor não encontrado." };
  if (setor._count.pessoas > 0) return { erro: "Mova as pessoas deste setor antes de excluí-lo." };
  await prisma.setor.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: "setor.excluido",
    entidade: "Setor",
    entidadeId: id,
    detalhes: { nome: setor.nome },
  });
  redirect("/admin/pessoas");
}

export async function salvarPessoa(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("pessoa.gerir");
  const id = String(formData.get("id") ?? "");
  const parsed = pessoaSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    setorId: formData.get("setorId") ?? "",
    podeReservar: marcado(formData, "podeReservar"),
    ativo: marcado(formData, "ativo"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  if (parsed.data.setorId) {
    const setor = await prisma.setor.findUnique({ where: { id: parsed.data.setorId }, select: { id: true } });
    if (!setor) return { erro: "Setor não encontrado." };
  }

  try {
    if (id) {
      await prisma.pessoa.update({ where: { id }, data: parsed.data });
      await registrarAuditoria({
        usuarioId: session.user.id,
        acao: "pessoa.editada",
        entidade: "Pessoa",
        entidadeId: id,
        detalhes: { nome: parsed.data.nome },
      });
    } else {
      const pessoa = await prisma.pessoa.create({ data: parsed.data });
      await registrarAuditoria({
        usuarioId: session.user.id,
        acao: "pessoa.criada",
        entidade: "Pessoa",
        entidadeId: pessoa.id,
        detalhes: { nome: pessoa.nome },
      });
    }
  } catch (error) {
    unstable_rethrow(error);
    const unica = mensagemUnica(error, { email: "Já existe uma pessoa com esse e-mail." });
    if (unica) return { erro: unica };
    throw error;
  }
  redirect("/admin/pessoas");
}

export async function excluirPessoa(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("pessoa.gerir");
  const id = String(formData.get("id") ?? "");
  const pessoa = await prisma.pessoa.findUnique({
    where: { id },
    include: {
      _count: { select: { reservasResp: true, participacoes: true } },
      usuario: { select: { id: true } },
    },
  });
  if (!pessoa) return { erro: "Pessoa não encontrada." };
  if (pessoa.usuario || pessoa._count.reservasResp > 0 || pessoa._count.participacoes > 0) {
    return { erro: "Esta pessoa já está em uso. Desative-a em vez de excluir." };
  }
  await prisma.pessoa.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: "pessoa.excluida",
    entidade: "Pessoa",
    entidadeId: id,
    detalhes: { nome: pessoa.nome },
  });
  redirect("/admin/pessoas");
}
