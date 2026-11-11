import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-green">SpaceOne</p>
        <h1 className="mt-2 text-2xl font-semibold text-navy">Entrar no painel</h1>
        <p className="mt-2 text-sm leading-relaxed">
          Acesso de administrador, gestor e recepção. O tablet da sala não usa esta tela.
        </p>
        <LoginForm callbackUrl={callbackUrl} />
      </section>
    </main>
  );
}
