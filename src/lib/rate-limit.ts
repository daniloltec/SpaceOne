type Janela = { count: number; reset: number };

const tentativas = new Map<string, Janela>();

export function permitirTentativa(chave: string, limite: number, janelaMs: number): boolean {
  const agora = Date.now();
  for (const [k, valor] of tentativas) {
    if (valor.reset < agora) tentativas.delete(k);
  }

  const atual = tentativas.get(chave);
  if (!atual) {
    tentativas.set(chave, { count: 1, reset: agora + janelaMs });
    return true;
  }

  if (atual.count >= limite) return false;
  atual.count += 1;
  return true;
}
