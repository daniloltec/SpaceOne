import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const logado = Boolean(req.auth?.user?.id && req.auth.user.perfil);

  if (pathname === "/api/saude" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (logado) return NextResponse.redirect(new URL("/", req.nextUrl));
    return NextResponse.next();
  }

  if (
    pathname === "/tablet" ||
    pathname.startsWith("/tablet/") ||
    pathname.startsWith("/midia/") ||
    pathname.startsWith("/api/tablet/")
  ) {
    return NextResponse.next();
  }

  if (!logado) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    }
    const login = new URL("/login", req.nextUrl);
    if (pathname !== "/") login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const admin = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
  if (admin && req.auth?.user?.perfil !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/sem-permissao", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
