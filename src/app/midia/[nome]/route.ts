import { NextResponse } from "next/server";
import { lerFoto } from "@/lib/uploads";

export async function GET(_request: Request, contexto: { params: Promise<{ nome: string }> }) {
  const { nome } = await contexto.params;
  const foto = await lerFoto(nome);
  if (!foto) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(foto.dados), {
    headers: {
      "Content-Type": foto.tipo,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
