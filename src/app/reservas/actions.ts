"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { cancelarReserva, criarReserva } from "@/lib/reservas-db";
import { requireAcao, requireUser } from "@/lib/sessao";
import { dataIsoValida, instanteNoFuso } from "@/lib/tempo";

type Estado = { erro: string };

const camposSchema = z.object({
  salaId: z.string().trim().min(1, "Escolha a sala."),
  responsavelId: z.string().trim(),
  assunto: z.string().trim().min(1, "Informe o assunto.").max(160, "O assunto é longo demais."),
  data: z.string().trim(),
  dataFim: z.string().trim(),
  inicio: z.string().trim(),
  fim: z.string().trim(),
  qtdParticipantes: z.coerce
    .number({ invalid_type_error: "Informe a quantidade de participantes." })
    .int("A quantidade precisa ser um número inteiro.")
    .min(1, "Informe ao menos 1 participante.")
    .max(500, "A quantidade máxima é 500."),
});

function horaValida(valor: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(valor);
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

export async function criarReservaAction(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireAcao("reserva.criar");
  const parsed = camposSchema.safeParse({
    salaId: formData.get("salaId"),
    responsavelId: formData.get("responsavelId") ?? "",
    assunto: formData.get("assunto"),
    data: formData.get("data"),
    dataFim: formData.get("dataFim") || formData.get("data"),
    inicio: formData.get("inicio"),
    fim: formData.get("fim"),
    qtdParticipantes: formData.get("qtdParticipantes"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const campos = parsed.data;
  if (!dataIsoValida(campos.data) || !dataIsoValida(campos.dataFim)) return { erro: "Informe a data." };
  if (!horaValida(campos.inicio) || !horaValida(campos.fim)) return { erro: "Informe um horário válido." };

  const resultado = await criarReserva({
    perfil: session.user.perfil,
    usuarioId: session.user.id,
    salaId: campos.salaId,
    responsavelId: campos.responsavelId,
    assunto: campos.assunto,
    inicio: instanteNoFuso(campos.data, campos.inicio),
    fim: instanteNoFuso(campos.dataFim, campos.fim),
    qtdParticipantes: campos.qtdParticipantes,
    participanteIds: formData.getAll("participanteIds").map(String),
  });
  if (!resultado.ok) return { erro: resultado.erro };
  redirect(`/reservas/${resultado.id}`);
}

export async function cancelarReservaAction(_estado: Estado, formData: FormData): Promise<Estado> {
  const session = await requireUser();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length > 300) return { erro: "O motivo é longo demais." };

  const resultado = await cancelarReserva({
    perfil: session.user.perfil,
    usuarioId: session.user.id,
    reservaId: String(formData.get("id") ?? ""),
    motivo,
  });
  if (!resultado.ok) return { erro: resultado.erro };
  redirect(`/reservas/${resultado.id}`);
}
