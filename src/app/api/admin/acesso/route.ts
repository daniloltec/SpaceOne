import { exigirAcaoApi } from "@/lib/sessao";

export async function GET() {
  const { session, error } = await exigirAcaoApi("sala.gerir");
  if (error || !session) return error;
  return Response.json({ ok: true, perfil: session.user.perfil });
}
