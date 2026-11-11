"use client";

import { useActionState } from "react";
import { salvarUsuario } from "@/app/admin/usuarios/actions";
import { botaoPrimario, campoClass } from "@/components/estilos";
import { rotuloPerfil, type Perfil } from "@/lib/permissions";

const perfis: Perfil[] = ["ADMIN", "GESTOR", "RECEPCAO"];

export function UsuarioForm({
  pessoas,
  usuario,
}: {
  pessoas: { id: string; nome: string; email: string }[];
  usuario?: { id: string; email: string; perfil: Perfil; ativo: boolean; pessoaId: string | null };
}) {
  const [estado, enviar, pendente] = useActionState(salvarUsuario, { erro: "" });

  return (
    <form action={enviar} className="grid gap-4 sm:grid-cols-2">
      {usuario ? <input type="hidden" name="id" value={usuario.id} /> : null}
      <div>
        <label htmlFor="usuario-email" className="block text-sm font-medium">
          E-mail
        </label>
        <input
          id="usuario-email"
          name="email"
          type="email"
          required
          defaultValue={usuario?.email ?? ""}
          className={campoClass}
        />
      </div>
      <div>
        <label htmlFor="usuario-senha" className="block text-sm font-medium">
          {usuario ? "Nova senha (opcional)" : "Senha"}
        </label>
        <input
          id="usuario-senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={usuario ? undefined : 8}
          required={!usuario}
          className={campoClass}
        />
      </div>
      <div>
        <label htmlFor="usuario-perfil" className="block text-sm font-medium">
          Perfil
        </label>
        <select id="usuario-perfil" name="perfil" defaultValue={usuario?.perfil ?? "RECEPCAO"} className={campoClass}>
          {perfis.map((perfil) => (
            <option key={perfil} value={perfil}>
              {rotuloPerfil(perfil)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="usuario-pessoa" className="block text-sm font-medium">
          Pessoa ligada
        </label>
        <select id="usuario-pessoa" name="pessoaId" defaultValue={usuario?.pessoaId ?? ""} className={campoClass}>
          <option value="">Nenhuma</option>
          {pessoas.map((pessoa) => (
            <option key={pessoa.id} value={pessoa.id}>
              {pessoa.nome} ({pessoa.email})
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={usuario?.ativo ?? true} />
        Usuário ativo
      </label>
      {estado.erro ? (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-2">
          {estado.erro}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pendente} className={botaoPrimario}>
          {pendente ? "Salvando..." : usuario ? "Salvar usuário" : "Cadastrar usuário"}
        </button>
      </div>
    </form>
  );
}
