import cron from "node-cron";
import { executarCiclo, portasDoAmbiente } from "@/lib/ciclo";
import { mensagemExterna } from "@/lib/ciclo-regras";
import { prisma } from "@/lib/db";
let emExecucao = false;

async function tick() {
  if (emExecucao) return;
  emExecucao = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const resultado = await executarCiclo(await portasDoAmbiente());
    console.log(
      `[worker] ${new Date().toISOString()} status=${resultado.status} google=${resultado.google} convites=${resultado.convites} lembretes=${resultado.lembretes} n8n=${resultado.n8n}`,
    );
  } catch (error) {
    console.error("[worker] falha no ciclo:", mensagemExterna(error));
  } finally {
    emExecucao = false;
  }
}

cron.schedule("* * * * *", () => {
  void tick();
});

void tick();
console.log("[worker] iniciado; ciclo a cada minuto");

async function encerrar() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void encerrar();
});
process.on("SIGINT", () => {
  void encerrar();
});
