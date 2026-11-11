#!/bin/sh
set -eu

echo "Aplicando migrations..."
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

if [ "${1:-app}" = "worker" ]; then
  echo "Iniciando worker..."
  exec node ./dist/worker.js
fi

echo "Garantindo dados iniciais..."
node ./dist/seed.js

echo "Iniciando aplicação..."
export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"
exec node ./server.js
