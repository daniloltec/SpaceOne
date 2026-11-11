import { z } from "zod";

export const salaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da sala.").max(80, "O nome da sala é longo demais."),
  descricao: z
    .string()
    .trim()
    .max(500, "A descrição é longa demais.")
    .transform((valor) => valor || null),
  capacidade: z.coerce
    .number({ invalid_type_error: "Informe a capacidade." })
    .int("A capacidade precisa ser um número inteiro.")
    .min(1, "A capacidade mínima é 1.")
    .max(500, "A capacidade máxima é 500."),
  ativa: z.boolean(),
  googleCalendarId: z
    .string()
    .trim()
    .max(200, "O identificador da agenda é longo demais.")
    .transform((valor) => valor || null),
});

export const setorSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do setor.").max(80, "O nome do setor é longo demais."),
});

export const pessoaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(120, "O nome é longo demais."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .transform((email) => email.toLowerCase()),
  setorId: z
    .string()
    .trim()
    .transform((valor) => valor || null),
  podeReservar: z.boolean(),
  ativo: z.boolean(),
});

export const usuarioSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Informe um e-mail válido.")
      .transform((email) => email.toLowerCase()),
    senha: z.string(),
    perfil: z.enum(["ADMIN", "GESTOR", "RECEPCAO"], { message: "Escolha um perfil." }),
    ativo: z.boolean(),
    pessoaId: z
      .string()
      .trim()
      .transform((valor) => valor || null),
  })
  .superRefine((valor, ctx) => {
    if (valor.perfil === "GESTOR" && !valor.pessoaId) {
      ctx.addIssue({
        code: "custom",
        path: ["pessoaId"],
        message: "O gestor precisa estar ligado a uma pessoa.",
      });
    }
  });

export function marcado(formData: FormData, nome: string): boolean {
  return formData.get(nome) === "on";
}

export function lerRecursos(formData: FormData, idsValidos: readonly string[]) {
  const validos = new Set(idsValidos);
  const marcados = [...new Set(formData.getAll("recurso").map(String))].filter((id) => validos.has(id));
  return marcados.map((recursoId) => {
    const bruto = Number(formData.get(`quantidade-${recursoId}`));
    const quantidade = Number.isInteger(bruto) && bruto >= 1 && bruto <= 99 ? bruto : 1;
    return { recursoId, quantidade };
  });
}

export function mensagemSenha(senha: string, obrigatoria: boolean): string | null {
  if (!senha && !obrigatoria) return null;
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  return null;
}
