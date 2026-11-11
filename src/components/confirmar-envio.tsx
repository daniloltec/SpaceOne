"use client";

import { useActionState } from "react";
import { botaoPerigo, botaoSecundario } from "@/components/estilos";

type Estado = { erro: string };
type Acao = (estado: Estado, dados: FormData) => Promise<Estado>;

export function ConfirmarEnvio({
  action,
  id,
  rotulo,
  pergunta,
  perigo = false,
  campos,
}: {
  action: Acao;
  id: string;
  rotulo: string;
  pergunta: string;
  perigo?: boolean;
  campos?: Record<string, string>;
}) {
  const [estado, enviar, pendente] = useActionState(action, { erro: "" });

  return (
    <form
      action={enviar}
      onSubmit={(evento) => {
        if (!window.confirm(pergunta)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {campos
        ? Object.entries(campos).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)
        : null}
      {estado.erro ? (
        <p role="alert" className="mb-2 text-sm font-medium text-danger">
          {estado.erro}
        </p>
      ) : null}
      <button type="submit" disabled={pendente} className={perigo ? botaoPerigo : botaoSecundario}>
        {pendente ? "Aguarde..." : rotulo}
      </button>
    </form>
  );
}
