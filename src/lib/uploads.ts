import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAXIMO = 5 * 1024 * 1024;
const NOME_ARQUIVO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export function diretorioUploads(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
}

export function nomeSeguro(nome: string): string | null {
  return NOME_ARQUIVO.test(nome) ? nome : null;
}

export async function salvarFoto(arquivo: File): Promise<string> {
  if (arquivo.size === 0) throw new Error("Escolha uma foto.");
  if (arquivo.size > MAXIMO) throw new Error("A foto deve ter no máximo 5 MB.");
  const extensao = TIPOS[arquivo.type];
  if (!extensao) throw new Error("Use uma foto JPG, PNG ou WebP.");

  const nome = `${crypto.randomUUID()}.${extensao}`;
  const diretorio = diretorioUploads();
  await mkdir(diretorio, { recursive: true });
  await writeFile(path.join(diretorio, nome), Buffer.from(await arquivo.arrayBuffer()));
  return `/midia/${nome}`;
}

export async function lerFoto(nome: string): Promise<{ dados: Buffer; tipo: string } | null> {
  const seguro = nomeSeguro(nome);
  if (!seguro) return null;
  try {
    const dados = await readFile(path.join(diretorioUploads(), seguro));
    const tipo = seguro.endsWith(".png") ? "image/png" : seguro.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return { dados, tipo };
  } catch {
    return null;
  }
}

export async function removerFoto(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith("/midia/")) return;
  const nome = nomeSeguro(path.basename(url));
  if (!nome) return;
  await unlink(path.join(diretorioUploads(), nome)).catch(() => undefined);
}
