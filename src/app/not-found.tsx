import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-navy">Página não encontrada</h1>
        <Link href="/" className="mt-4 inline-block font-medium text-green underline">
          Ir para o início
        </Link>
      </section>
    </main>
  );
}
