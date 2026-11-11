import { carregarEstadoTablet } from "@/lib/tablet-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let fechado = false;

  const stream = new ReadableStream({
    start(controller) {
      const enviar = async () => {
        if (fechado) return;
        try {
          const estado = await carregarEstadoTablet(token);
          if (!estado) {
            controller.enqueue(encoder.encode("event: fim\ndata: {}\n\n"));
            fechado = true;
            if (timer) clearInterval(timer);
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(estado)}\n\n`));
        } catch {
          fechado = true;
          if (timer) clearInterval(timer);
          try {
            controller.close();
          } catch {
            /* a conexão já foi encerrada */
          }
        }
      };

      controller.enqueue(encoder.encode("retry: 5000\n\n"));
      void enviar();
      timer = setInterval(() => void enviar(), 5000);
    },
    cancel() {
      fechado = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
