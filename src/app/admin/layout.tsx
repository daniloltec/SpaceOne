import { requireAcao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAcao("sala.gerir");
  return children;
}
