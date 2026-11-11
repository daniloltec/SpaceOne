"use client";

import { useActionState } from "react";
import { cancelarReservaAction } from "@/app/reservas/actions";
import { botaoPerigo, campoClass } from "@/components/estilos";

export function CancelarReserva({ id }: { id: string }) {
  const [estado, enviar, pendente] = useActionState(cancelarReservaAction, { erro: "" });

  return (
    <form
      id="form-cancelar"
      action={enviar}
      className="mt-6 max-w-lg space-y-3 rounded-xl border border-danger/30 bg-white p-4"
      onSubmit={(evento) => {
        if (!window.confirm("Cancelar esta reserva?")) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <label htmlFor="motivo" className="block text-sm font-medium">
        Motivo do cancelamento (opcional)
      </label>
      <input id="motivo" name="motivo" maxLength={300} className={campoClass} />
      {estado.erro ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {estado.erro}
        </p>
      ) : null}
      <button type="submit" disabled={pendente} className={botaoPerigo}>
        {pendente ? "Cancelando..." : "Cancelar reserva"}
      </button>
    </form>
  );
}
