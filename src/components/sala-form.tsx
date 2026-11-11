"use client";

import { useActionState } from "react";
import { salvarSala } from "@/app/admin/salas/actions";
import { botaoPrimario, campoClass } from "@/components/estilos";

type RecursoOpcao = { id: string; nome: string };
type SalaInicial = {
  id: string;
  nome: string;
  descricao: string;
  capacidade: number;
  ativa: boolean;
  googleCalendarId: string;
  fotoUrl: string | null;
  recursos: { recursoId: string; quantidade: number }[];
};

export function SalaForm({
  recursos,
  sala,
}: {
  recursos: RecursoOpcao[];
  sala?: SalaInicial;
}) {
  const [estado, enviar, pendente] = useActionState(salvarSala, { erro: "" });
  const escolhidos = new Map(sala?.recursos.map((item) => [item.recursoId, item.quantidade]) ?? []);

  return (
    <form action={enviar} className="space-y-4">
      {sala ? <input type="hidden" name="id" value={sala.id} /> : null}
      <div>
        <label htmlFor="nome" className="block text-sm font-medium">
          Nome
        </label>
        <input id="nome" name="nome" required defaultValue={sala?.nome ?? ""} className={campoClass} />
      </div>
      <div>
        <label htmlFor="descricao" className="block text-sm font-medium">
          Descrição
        </label>
        <textarea id="descricao" name="descricao" rows={3} defaultValue={sala?.descricao ?? ""} className={campoClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="capacidade" className="block text-sm font-medium">
            Capacidade
          </label>
          <input
            id="capacidade"
            name="capacidade"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={sala?.capacidade ?? 4}
            className={campoClass}
          />
        </div>
        <div>
          <label htmlFor="googleCalendarId" className="block text-sm font-medium">
            Agenda Google (opcional)
          </label>
          <input
            id="googleCalendarId"
            name="googleCalendarId"
            defaultValue={sala?.googleCalendarId ?? ""}
            className={campoClass}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativa" defaultChecked={sala?.ativa ?? true} />
        Sala ativa
      </label>
      <div>
        <label htmlFor="foto" className="block text-sm font-medium">
          Foto
        </label>
        {sala?.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sala.fotoUrl} alt="" className="mt-2 h-28 w-44 rounded-md object-cover" />
        ) : null}
        <input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block text-sm" />
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Recursos</legend>
        <div className="mt-2 space-y-2">
          {recursos.length === 0 ? <p className="text-sm">Nenhum recurso cadastrado.</p> : null}
          {recursos.map((recurso) => {
            const quantidade = escolhidos.get(recurso.id);
            return (
              <label key={recurso.id} className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="recurso" value={recurso.id} defaultChecked={quantidade !== undefined} />
                <span className="min-w-32">{recurso.nome}</span>
                <input
                  aria-label={`Quantidade de ${recurso.nome}`}
                  name={`quantidade-${recurso.id}`}
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={quantidade ?? 1}
                  className="w-20 rounded-md border border-navy/20 px-2 py-1"
                />
              </label>
            );
          })}
        </div>
      </fieldset>
      {estado.erro ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {estado.erro}
        </p>
      ) : null}
      <button type="submit" disabled={pendente} className={botaoPrimario}>
        {pendente ? "Salvando..." : "Salvar sala"}
      </button>
    </form>
  );
}
