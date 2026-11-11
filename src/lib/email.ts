import nodemailer from "nodemailer";

export function smtpAtivo(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim());
}

export async function enviarEmail(mensagem: { para: string; assunto: string; texto: string }, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  if (!host || !from) throw new Error("SMTP não configurado");
  const port = Number(env.SMTP_PORT || 587);
  const usuario = env.SMTP_USER?.trim();
  const transporte = nodemailer.createTransport({
    host,
    port: Number.isInteger(port) ? port : 587,
    secure: port === 465,
    auth: usuario ? { user: usuario, pass: env.SMTP_PASS ?? "" } : undefined,
  });
  await transporte.sendMail({
    from,
    to: mensagem.para,
    subject: mensagem.assunto,
    text: mensagem.texto,
  });
}
