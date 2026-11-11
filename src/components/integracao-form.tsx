"use client";

import { useActionState } from "react";
import { salvarIntegracao, type EstadoIntegracao } from "@/app/admin/integracoes/actions";
import { botaoPrimario, campoClass } from "@/components/estilos";
import { EVENTOS_N8N } from "@/lib/n8n-eventos";

const inicial: EstadoIntegracao = { erro: "", ok: "" };

const rotulos: Record<(typeof EVENTOS_N8N)[number], string> = {
  "reserva.criada": "Reserva criada",
  "reserva.cancelada": "Reserva cancelada",
  "reserva.iniciada": "Reunião iniciada",
  "reserva.finalizada": "Reunião finalizada",
};

export function IntegracaoForm({
  webhookUrl,
  temSegredo,
  ativa,
  eventos,
}: {
  webhookUrl: string;
  temSegredo: boolean;
  ativa: boolean;
  eventos: string[];
}) {
  const [estado, enviar, pendente] = useActionState(salvarIntegracao, inicial);

  return (
    <form id="form-integracao" action={enviar} className="mt-4 grid gap-4">
      <div>
        <label htmlFor="n8n-url" className="block text-sm font-medium">
          URL pública do webhook
        </label>
        <input
          id="n8n-url"
          name="webhookUrl"
          type="url"
          required
          defaultValue={webhookUrl}
          placeholder="https://n8n.seudominio/webhook/spaceone"
          className={campoClass}
        />
      </div>
      <div>
        <label htmlFor="n8n-segredo" className="block text-sm font-medium">
          Segredo da assinatura
        </label>
        <input
          id="n8n-segredo"
          name="segredo"
          type="password"
          autoComplete="new-password"
          placeholder={temSegredo ? "Deixe em branco para manter o segredo atual" : "Um segredo longo"}
          className={campoClass}
        />
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Eventos</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {EVENTOS_N8N.map((evento) => (
            <label key={evento} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="eventos" value={evento} defaultChecked={eventos.includes(evento)} />
              {rotulos[evento]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input id="n8n-ativa" type="checkbox" name="ativa" defaultChecked={ativa} />
        Enviar eventos para o N8N
      </label>
      {estado.erro ? (
        <p className="text-sm text-danger" role="alert">
          {estado.erro}
        </p>
      ) : null}
      {estado.ok ? <p className="text-sm text-green">{estado.ok}</p> : null}
      <button type="submit" className={botaoPrimario} disabled={pendente}>
        Guardar conexão
      </button>
    </form>
  );
}
