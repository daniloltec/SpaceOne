-- Referência da regra de conflito.
-- O deploy aplica este SQL em prisma/migrations/20261104190000_init/migration.sql.
-- Não execute este arquivo de novo se `prisma migrate deploy` já rodou.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reserva"
  ADD CONSTRAINT reserva_sem_conflito
  EXCLUDE USING gist (
    "salaId" WITH =,
    tstzrange("inicio", "fim", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELADA');

ALTER TABLE "Reserva"
  ADD CONSTRAINT reserva_fim_maior_que_inicio CHECK ("fim" > "inicio");