import { describe, expect, it } from "vitest";
import { destinoInterno } from "@/lib/destino";

describe("destino interno", () => {
  it("mantém caminho do próprio site", () => {
    expect(destinoInterno("/admin/estatisticas")).toBe("/admin/estatisticas");
    expect(destinoInterno("https://outro.exemplo")).toBe("/");
    expect(destinoInterno("//outro.exemplo")).toBe("/");
    expect(destinoInterno("/\\outro.exemplo")).toBe("/");
  });
});
