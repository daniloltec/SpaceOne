import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Informe a senha."),
});
