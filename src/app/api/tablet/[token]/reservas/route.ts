import { NextResponse } from "next/server";
import { z } from "zod";
import { permitirTentativa } from "@/lib/rate-limit";
import { reservarPeloTablet } from "@/lib/tablet-db";

export const dynamic = "force-dynamic";

const schema = z.object({
  responsavelId: z.string().trim().min(1, "Escolha o responsável."),
  inicio: z.string().datetime({ message: "Informe o início." }),
  fim: z.string().datetime({ message: "Informe o fim." }),
  qtdParticipantes: z.number().int().min(1).max(500),
  participanteIds: z.array(z.string()).max(100).default([]),
  assunto: z.string().trim().min(1, "Informe o assunto.").max(160, "O assunto é longo demais."),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!permitirTentativa(`tablet:${token}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um pouco." }, { status: 429 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const parsed = schema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const resultado = await reservarPeloTablet(token, {
    responsavelId: parsed.data.responsavelId,
    inicio: new Date(parsed.data.inicio),
    fim: new Date(parsed.data.fim),
    qtdParticipantes: parsed.data.qtdParticipantes,
    participanteIds: parsed.data.participanteIds,
    assunto: parsed.data.assunto,
  });
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  return NextResponse.json({ id: resultado.id });
}
