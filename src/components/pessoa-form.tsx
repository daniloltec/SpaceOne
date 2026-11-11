"use client";

import { useActionState } from "react";
import { salvarPessoa, salvarSetor } from "@/app/admin/pessoas/actions";
import { botaoPrimario, botaoSecundario, campoClass } from "@/components/estilos";

export function SetorForm({ setor }: { setor?: { id: string; nome: string } }) {
  const [estado, enviar, pendente] = useActionState(salvarSetor, { erro: "" });

  return (
    <form action={enviar} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      {setor ? <input type="hidden" name="id" value={setor.id} /> : null}
      <div className="flex-1">
        <label htmlFor={setor ? `setor-${setor.id}` : "setor-novo"} className="block text-sm font-medium">
          {setor ? "Nome do setor" : "Novo setor"}
        </label>
        <input
          id={setor ? `setor-${setor.id}` : "setor-novo"}
          name="nome"
          required
          defaultValue={setor?.nome ?? ""}
          className={campoClass}
        />
      </div>
      <button type="submit" disabled={pendente} className={setor ? botaoSecundario : botaoPrimario}>
        {pendente ? "Salvando..." : setor ? "Renomear" : "Adicionar setor"}
      </button>
      {estado.erro ? (
        <p role="alert" className="text-sm font-medium text-danger sm:basis-full">
          {estado.erro}
        </p>
      ) : null}
    </form>
  );
}

export function PessoaForm({
  setores,
  pessoa,
}: {
  setores: { id: string; nome: string }[];
  pessoa?: {
    id: string;
    nome: string;
    email: string;
    setorId: string | null;
    podeReservar: boolean;
    ativo: boolean;
  };
}) {
  const [estado, enviar, pendente] = useActionState(salvarPessoa, { erro: "" });

  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      {pessoa ? <input type="hidden" name="id" value={pessoa.id} /> : null}
      <div>
        <label htmlFor="pessoa-nome" className="block text-sm font-medium">
          Nome
        </label>
        <input id="pessoa-nome" name="nome" required defaultValue={pessoa?.nome ?? ""} className={campoClass} />
      </div>
      <div>
        <label htmlFor="pessoa-email" className="block text-sm font-medium">
          E-mail
        </label>
        <input
          id="pessoa-email"
          name="email"
          type="email"
          required
          defaultValue={pessoa?.email ?? ""}
          className={campoClass}
        />
      </div>
      <div>
        <label htmlFor="pessoa-setor" className="block text-sm font-medium">
          Setor
        </label>
        <select id="pessoa-setor" name="setorId" defaultValue={pessoa?.setorId ?? ""} className={campoClass}>
          <option value="">Sem setor</option>
          {setores.map((setor) => (
            <option key={setor.id} value={setor.id}>
              {setor.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col justify-end gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="podeReservar" defaultChecked={pessoa?.podeReservar ?? false} />
          Pode ser responsável por reserva
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ativo" defaultChecked={pessoa?.ativo ?? true} />
          Pessoa ativa
        </label>
      </div>
      {estado.erro ? (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-2">
          {estado.erro}
        </p>
      ) : null}
      <div>
        <button type="submit" disabled={pendente} className={botaoPrimario}>
          {pendente ? "Salvando..." : pessoa ? "Salvar pessoa" : "Cadastrar pessoa"}
        </button>
      </div>
    </form>
  );
}
