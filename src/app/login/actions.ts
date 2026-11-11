"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { destinoInterno } from "@/lib/destino";
import { permitirTentativa } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error: string };

const LIMITE = 8;
const JANELA_MS = 15 * 60 * 1000;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Informe e-mail e senha válidos." };
  }

  if (!permitirTentativa(parsed.data.email, LIMITE, JANELA_MS)) {
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: destinoInterno(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw error;
  }

  return { error: "" };
}
