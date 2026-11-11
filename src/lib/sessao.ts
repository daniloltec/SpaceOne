import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { isPerfil, pode, type Acao, type Perfil } from "@/lib/permissions";

export type SessaoAutenticada = {
  user: {
    id: string;
    email: string;
    perfil: Perfil;
    name?: string | null;
    image?: string | null;
  };
};

function sessaoValida(session: Session | null): SessaoAutenticada | null {
  if (!session?.user?.id || !session.user.email || !isPerfil(session.user.perfil)) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      perfil: session.user.perfil,
      name: session.user.name,
      image: session.user.image,
    },
  };
}

export async function requireUser(): Promise<SessaoAutenticada> {
  const session = sessaoValida(await auth());
  if (!session) redirect("/login");
  return session;
}

export async function requireAcao(acao: Acao): Promise<SessaoAutenticada> {
  const session = await requireUser();
  if (!pode(session.user.perfil, acao)) redirect("/sem-permissao");
  return session;
}

export async function exigirAcaoApi(acao: Acao) {
  const session = sessaoValida(await auth());
  if (!session) {
    return { session: null, error: NextResponse.json({ erro: "Não autenticado" }, { status: 401 }) };
  }
  if (!pode(session.user.perfil, acao)) {
    return { session: null, error: NextResponse.json({ erro: "Sem permissão" }, { status: 403 }) };
  }
  return { session, error: null };
}
