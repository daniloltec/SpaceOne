"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { lerRecursos, marcado, salaSchema } from "@/lib/cadastros";
import { mensagemUnica } from "@/lib/prisma-erro";
import { requireAcao } from "@/lib/sessao";
import { removerFoto, salvarFoto } from "@/lib/uploads";

type Estado = { erro: string };

function arquivoFoto(formData: FormData): File | null {
  const arquivo = formData.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  return arquivo;
}

async function recursosValidos(formData: FormData) {
  const catalogo = await prisma.recurso.findMany({ select: { id: true } });
  return lerRecursos(
    formData,
    catalogo.map((item) => item.id),
  );
}

export async function salvarSala(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("sala.gerir");
  const id = String(formData.get("id") ?? "");
  const parsed = salaSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") ?? "",
    capacidade: formData.get("capacidade"),
    ativa: marcado(formData, "ativa"),
    googleCalendarId: formData.get("googleCalendarId") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const recursos = await recursosValidos(formData);
  const foto = arquivoFoto(formData);
  let fotoNova: string | null = null;
  let salaId = id;

  try {
    if (foto) fotoNova = await salvarFoto(foto);
    const dados = { ...parsed.data, ...(fotoNova ? { fotoUrl: fotoNova } : {}) };

    if (!id) {
      const sala = await prisma.sala.create({
        data: {
          ...dados,
          recursos: { create: recursos },
        },
      });
      salaId = sala.id;
    } else {
      const atual = await prisma.sala.findUnique({ where: { id }, select: { fotoUrl: true } });
      if (!atual) {
        if (fotoNova) await removerFoto(fotoNova);
        return { erro: "Sala não encontrada." };
      }

      await prisma.$transaction([
        prisma.sala.update({ where: { id }, data: dados }),
        prisma.salaRecurso.deleteMany({ where: { salaId: id } }),
        ...(recursos.length
          ? [prisma.salaRecurso.createMany({ data: recursos.map((item) => ({ salaId: id, ...item })) })]
          : []),
      ]);

      if (fotoNova && atual.fotoUrl) await removerFoto(atual.fotoUrl);
    }
  } catch (error) {
    unstable_rethrow(error);
    if (fotoNova) await removerFoto(fotoNova);
    const unica = mensagemUnica(error, { nome: "Já existe uma sala com esse nome." });
    if (unica) return { erro: unica };
    throw error;
  }

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: id ? "sala.editada" : "sala.criada",
    entidade: "Sala",
    entidadeId: salaId,
    detalhes: { nome: parsed.data.nome },
  });
  redirect(`/admin/salas/${salaId}`);
}

export async function excluirSala(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("sala.gerir");
  const id = String(formData.get("id") ?? "");
  const sala = await prisma.sala.findUnique({
    where: { id },
    include: { _count: { select: { reservas: true } } },
  });
  if (!sala) return { erro: "Sala não encontrada." };
  if (sala._count.reservas > 0) {
    return { erro: "Esta sala já tem reservas. Desative-a em vez de excluir." };
  }

  await prisma.sala.delete({ where: { id } });
  await removerFoto(sala.fotoUrl);
  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: "sala.excluida",
    entidade: "Sala",
    entidadeId: id,
    detalhes: { nome: sala.nome },
  });
  redirect("/admin/salas");
}

export async function alternarSala(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("sala.gerir");
  const id = String(formData.get("id") ?? "");
  const sala = await prisma.sala.findUnique({ where: { id }, select: { ativa: true, nome: true } });
  if (!sala) return { erro: "Sala não encontrada." };
  await prisma.sala.update({ where: { id }, data: { ativa: !sala.ativa } });
  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: sala.ativa ? "sala.desativada" : "sala.ativada",
    entidade: "Sala",
    entidadeId: id,
    detalhes: { nome: sala.nome },
  });
  redirect(`/admin/salas/${id}`);
}

export async function renovarLinkTablet(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("sala.gerir");
  const id = String(formData.get("id") ?? "");
  const sala = await prisma.sala.findUnique({ where: { id }, select: { nome: true } });
  if (!sala) return { erro: "Sala não encontrada." };
  await prisma.sala.update({ where: { id }, data: { tabletToken: crypto.randomUUID() } });
  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: "sala.link_tablet",
    entidade: "Sala",
    entidadeId: id,
    detalhes: { nome: sala.nome },
  });
  redirect(`/admin/salas/${id}`);
}

export async function criarRecurso(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("sala.gerir");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome || nome.length > 80) return { erro: "Informe o nome do recurso." };
  try {
    const recurso = await prisma.recurso.create({ data: { nome } });
    await registrarAuditoria({
      usuarioId: session.user.id,
      acao: "recurso.criado",
      entidade: "Recurso",
      entidadeId: recurso.id,
      detalhes: { nome },
    });
  } catch (error) {
    const unica = mensagemUnica(error, { nome: "Já existe um recurso com esse nome." });
    if (unica) return { erro: unica };
    throw error;
  }
  redirect("/admin/salas");
}
