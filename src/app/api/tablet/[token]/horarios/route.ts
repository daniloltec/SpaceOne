import { NextResponse } from "next/server";
import { horariosTablet } from "@/lib/tablet-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = new URL(request.url).searchParams.get("data") ?? "";
  const horarios = await horariosTablet(token, data);
  if (!horarios) return NextResponse.json({ erro: "Não foi possível consultar os horários." }, { status: 404 });
  return NextResponse.json(horarios, { headers: { "Cache-Control": "no-store" } });
}
