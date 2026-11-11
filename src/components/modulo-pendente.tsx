export function ModuloPendente({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <section className="rounded-xl border border-navy/10 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-navy">{titulo}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed">{descricao}</p>
    </section>
  );
}
