"use client";

import { useState } from "react";
import { botaoSecundario, campoClass } from "@/components/estilos";

export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input readOnly value={url} aria-label="Link do tablet" className={campoClass} />
      <button type="button" onClick={() => void copiar()} className={botaoSecundario}>
        {copiado ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}
