export function destinoInterno(valor: unknown): string {
  if (typeof valor !== "string") return "/";
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/login")) return "/";
  if (valor.includes("\\") || valor.includes("%") || valor.includes("\n") || valor.includes("\r")) return "/";
  return valor;
}
