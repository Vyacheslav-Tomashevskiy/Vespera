#!/bin/sh
# Optional: run TypeORM migrations before app start (set RUN_MIGRATIONS_ON_START=true).
set -e
cd /app

if [ "${RUN_MIGRATIONS_ON_START:-}" = "true" ]; then
  echo "[docker-entrypoint] Running database migrations..."
  node ./node_modules/typeorm/cli.js migration:run -d ./dist/src/database/data-source.js
fi

exec "$@"
