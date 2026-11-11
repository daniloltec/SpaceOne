"use client";

import { useActionState } from "react";
import { criarReservaAction } from "@/app/reservas/actions";
import { botaoPrimario, campoClass } from "@/components/estilos";

type PessoaOpcao = { id: string; nome: string; email: string };

export function ReservaForm({
  salas,
  responsaveis,
  pessoas,
  valores,
  responsavelFixo,
}: {
  salas: { id: string; nome: string; capacidade: number }[];
  responsaveis: PessoaOpcao[];
  pessoas: PessoaOpcao[];
  valores: {
    salaId: string;
    data: string;
    dataFim: string;
    inicio: string;
    fim: string;
  };
  responsavelFixo: { id: string; nome: string } | null;
}) {
  const [estado, enviar, pendente] = useActionState(criarReservaAction, { erro: "" });

  return (
    <form id="form-reserva" action={enviar} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="salaId" className="block text-sm font-medium">
          Sala
        </label>
        <select id="salaId" name="salaId" required defaultValue={valores.salaId} className={campoClass}>
          <option value="">Escolha</option>
          {salas.map((sala) => (
            <option key={sala.id} value={sala.id}>
              {sala.nome} · {sala.capacidade} lugares
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="assunto" className="block text-sm font-medium">
          Assunto
        </label>
        <input id="assunto" name="assunto" required maxLength={160} className={campoClass} />
      </div>
      <div>
        <label htmlFor="data" className="block text-sm font-medium">
          Data de início
        </label>
        <input id="data" name="data" type="date" required defaultValue={valores.data} className={campoClass} />
      </div>
      <div>
        <label htmlFor="inicio" className="block text-sm font-medium">
          Início
        </label>
        <input id="inicio" name="inicio" type="time" required defaultValue={valores.inicio} className={campoClass} />
      </div>
      <div>
        <label htmlFor="dataFim" className="block text-sm font-medium">
          Data final
        </label>
        <input id="dataFim" name="dataFim" type="date" required defaultValue={valores.dataFim} className={campoClass} />
      </div>
      <div>
        <label htmlFor="fim" className="block text-sm font-medium">
          Fim
        </label>
        <input id="fim" name="fim" type="time" required defaultValue={valores.fim} className={campoClass} />
      </div>
      <div>
        <label htmlFor="qtdParticipantes" className="block text-sm font-medium">
          Quantidade de pessoas
        </label>
        <input
          id="qtdParticipantes"
          name="qtdParticipantes"
          type="number"
          min={1}
          max={500}
          required
          defaultValue={1}
          className={campoClass}
        />
      </div>
      <div>
        {responsavelFixo ? (
          <>
            <p className="text-sm font-medium">Responsável</p>
            <p className="mt-2 rounded-md border border-navy/10 bg-surface px-3 py-2">{responsavelFixo.nome}</p>
            <input type="hidden" name="responsavelId" value={responsavelFixo.id} />
          </>
        ) : (
          <>
            <label htmlFor="responsavelId" className="block text-sm font-medium">
              Responsável
            </label>
            <select id="responsavelId" name="responsavelId" required defaultValue="" className={campoClass}>
              <option value="">Escolha</option>
              {responsaveis.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.nome}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Participantes (opcional)</legend>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-navy/10 p-3">
          {pessoas.length === 0 ? <p className="text-sm">Nenhuma pessoa ativa cadastrada.</p> : null}
          {pessoas.map((pessoa) => (
            <label key={pessoa.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="participanteIds" value={pessoa.id} />
              <span>
                {pessoa.nome} <span className="text-ink/60">{pessoa.email}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {estado.erro ? (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-2">
          {estado.erro}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pendente} className={botaoPrimario}>
          {pendente ? "Reservando..." : "Criar reserva"}
        </button>
      </div>
    </form>
  );
}
