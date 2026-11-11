"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { marcado, mensagemSenha, usuarioSchema } from "@/lib/cadastros";
import { hashPassword } from "@/lib/password";
import { mensagemUnica } from "@/lib/prisma-erro";
import { requireAcao } from "@/lib/sessao";

type Estado = { erro: string };

async function restariaAdmin(id: string, perfil: string, ativo: boolean) {
  if (perfil === "ADMIN" && ativo) return true;
  const outros = await prisma.usuario.count({
    where: { perfil: "ADMIN", ativo: true, NOT: { id } },
  });
  return outros > 0;
}

export async function salvarUsuario(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("usuario.gerir");
  const id = String(formData.get("id") ?? "");
  const parsed = usuarioSchema.safeParse({
    email: formData.get("email"),
    senha: String(formData.get("senha") ?? ""),
    perfil: formData.get("perfil"),
    ativo: marcado(formData, "ativo"),
    pessoaId: formData.get("pessoaId") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const erroSenha = mensagemSenha(parsed.data.senha, !id);
  if (erroSenha) return { erro: erroSenha };

  if (id && !(await restariaAdmin(id, parsed.data.perfil, parsed.data.ativo))) {
    return { erro: "É preciso manter pelo menos um administrador ativo." };
  }

  if (parsed.data.pessoaId) {
    const pessoa = await prisma.pessoa.findUnique({
      where: { id: parsed.data.pessoaId },
      include: { usuario: { select: { id: true } } },
    });
    if (!pessoa) return { erro: "Pessoa não encontrada." };
    if (pessoa.usuario && pessoa.usuario.id !== id) return { erro: "Essa pessoa já está ligada a outro usuário." };
  }

  const senhaHash = parsed.data.senha ? await hashPassword(parsed.data.senha) : undefined;
  const dados = {
    email: parsed.data.email,
    perfil: parsed.data.perfil,
    ativo: parsed.data.ativo,
    pessoaId: parsed.data.pessoaId,
    ...(senhaHash ? { senhaHash } : {}),
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.perfil === "GESTOR" && parsed.data.pessoaId) {
        await tx.pessoa.update({ where: { id: parsed.data.pessoaId }, data: { podeReservar: true } });
      }
      if (id) {
        await tx.usuario.update({ where: { id }, data: dados });
      } else {
        await tx.usuario.create({ data: { ...dados, senhaHash: senhaHash ?? "" } });
      }
    });
    await registrarAuditoria({
      usuarioId: session.user.id,
      acao: id ? "usuario.editado" : "usuario.criado",
      entidade: "Usuario",
      entidadeId: id || parsed.data.email,
      detalhes: { email: parsed.data.email, perfil: parsed.data.perfil },
    });
  } catch (error) {
    unstable_rethrow(error);
    const unica = mensagemUnica(error, {
      email: "Já existe um usuário com esse e-mail.",
      pessoaId: "Essa pessoa já está ligada a outro usuário.",
    });
    if (unica) return { erro: unica };
    throw error;
  }
  redirect("/admin/usuarios");
}

export async function excluirUsuario(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("usuario.gerir");
  const id = String(formData.get("id") ?? "");
  if (id === session.user.id) return { erro: "Você não pode excluir o próprio usuário." };
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { email: true, perfil: true, ativo: true } });
  if (!usuario) return { erro: "Usuário não encontrado." };
  if (!(await restariaAdmin(id, "RECEPCAO", false))) {
    return { erro: "É preciso manter pelo menos um administrador ativo." };
  }
  await prisma.usuario.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: "usuario.excluido",
    entidade: "Usuario",
    entidadeId: id,
    detalhes: { email: usuario.email },
  });
  redirect("/admin/usuarios");
}
