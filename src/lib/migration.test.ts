import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("migration inicial", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "prisma/migrations/20261104190000_init/migration.sql"),
    "utf8",
  );

  it("impede sobreposição na mesma sala e exige fim maior que início", () => {
    expect(sql).toContain("btree_gist");
    expect(sql).toContain("reserva_sem_conflito");
    expect(sql).toContain("reserva_fim_maior_que_inicio");
    expect(sql).toContain("CANCELADA");
    expect(sql).toContain('tstzrange("inicio", "fim", \'[)\')');
  });
});
