import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const RECURSOS = [
  { nome: "Câmera", icone: "camera" },
  { nome: "Microfone", icone: "mic" },
  { nome: "Televisão", icone: "tv" },
  { nome: "Computador", icone: "monitor" },
  { nome: "Quadro branco", icone: "presentation" },
  { nome: "Ar-condicionado", icone: "snowflake" },
];

const CONFIGS = [
  { chave: "lembrete_minutos_antes", valor: "15" },
  { chave: "aviso_laranja_minutos_antes", valor: "15" },
];

function exigir(nome: string): string {
  const valor = process.env[nome]?.trim();
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

async function main() {
  const email = exigir("ADMIN_EMAIL").toLowerCase();
  const senha = exigir("ADMIN_PASSWORD");

  const admin = await prisma.usuario.findUnique({ where: { email } });
  if (!admin) {
    await prisma.usuario.create({
      data: {
        email,
        senhaHash: await hashPassword(senha),
        perfil: "ADMIN",
      },
    });
    console.log("Administrador criado.");
  } else {
    console.log("Administrador já existe; senha preservada.");
  }

  for (const recurso of RECURSOS) {
    await prisma.recurso.upsert({
      where: { nome: recurso.nome },
      update: {},
      create: recurso,
    });
  }

  for (const config of CONFIGS) {
    await prisma.configuracao.upsert({
      where: { chave: config.chave },
      update: {},
      create: config,
    });
  }

  console.log("Recursos e configurações garantidos.");
}

main()
  .catch((error: unknown) => {
    const mensagem = error instanceof Error ? error.message : "Falha no seed";
    console.error(mensagem.includes("postgresql://") ? "Falha no seed" : mensagem);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
