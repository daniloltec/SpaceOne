import type { NextAuthConfig } from "next-auth";
import { isPerfil } from "@/lib/permissions";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user && isPerfil(user.perfil)) {
        token.perfil = user.perfil;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && isPerfil(token.perfil)) {
        session.user.id = token.sub;
        session.user.perfil = token.perfil;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
