import { NextResponse } from "next/server";
import { carregarEstadoTablet } from "@/lib/tablet-db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estado = await carregarEstadoTablet(token);
  if (!estado) return NextResponse.json({ erro: "Sala não encontrada." }, { status: 404 });
  return NextResponse.json(estado, { headers: { "Cache-Control": "no-store" } });
}
