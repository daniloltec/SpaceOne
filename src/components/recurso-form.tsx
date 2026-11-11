"use client";

import { useActionState } from "react";
import { criarRecurso } from "@/app/admin/salas/actions";
import { botaoSecundario, campoClass } from "@/components/estilos";

export function RecursoForm() {
  const [estado, enviar, pendente] = useActionState(criarRecurso, { erro: "" });

  return (
    <form action={enviar} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="nome-recurso" className="block text-sm font-medium">
          Novo recurso
        </label>
        <input id="nome-recurso" name="nome" required className={campoClass} />
      </div>
      <button type="submit" disabled={pendente} className={botaoSecundario}>
        {pendente ? "Salvando..." : "Adicionar"}
      </button>
      {estado.erro ? (
        <p role="alert" className="text-sm font-medium text-danger sm:basis-full">
          {estado.erro}
        </p>
      ) : null}
    </form>
  );
}
