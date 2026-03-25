# Database migrations (TypeORM)

This project uses **TypeORM migrations** with a versioned `migrations` table. Schema changes must go through migrations in production (`synchronize: false` in `AppModule`).

## Configuration

| File | Purpose |
|------|---------|
| [`data-source.ts`](./data-source.ts) | CLI `DataSource` for generate / run / revert / show |
| [`migration-runner.ts`](./migration-runner.ts) | `run` with optional auto-revert on failure, `revert`, `show` |

Connection uses either **`DATABASE_URL`** or discrete **`DB_HOST`**, **`DB_PORT`**, **`DB_USERNAME`**, **`DB_PASSWORD`**, **`DB_NAME`**.

Optional TLS: **`DB_SSL=true`**. By default `rejectUnauthorized` is **false** (common for managed providers). Set **`DB_SSL_REJECT_UNAUTHORIZED=true`** to enforce certificate verification.

## Naming convention

- **File**: `{timestamp}-{PascalCaseDescription}.ts` under `src/migrations/` (or `migrations/` at the backend package root; both are loaded and compiled)
- **Class**: `{Description}{timestamp}` (must match TypeORM expectations)
- **Property** `name`: same as class name string (e.g. `CreatePaymentEntities1769187000000`)

Use a **new** Unix-ms timestamp greater than the latest migration in the repo.

## Commands (development)

| Script | Description |
|--------|-------------|
| `pnpm run migration:generate -- src/migrations/<ts-path>` | Generate migration from entity/schema diff |
| `pnpm run migration:create -- src/migrations/<ts-path>` | Empty migration file |
| `pnpm run migration:run` | Apply pending migrations (TypeORM CLI) |
| `pnpm run migration:run:safe` | Apply pending migrations; on failure attempts undo last migration |
| `pnpm run migration:revert` | Revert **one** migration (last in batch order) |
| `pnpm run migration:revert:safe` | Same as `migration:revert` via runner |
| `pnpm run migration:show` | Show pending migrations (CLI) |
| `pnpm run migration:show:safe` | Show pending migrations (runner) |

## Commands (production / compiled)

After `pnpm run build` (Nest emits under `dist/src/`):

| Script | Description |
|--------|-------------|
| `pnpm run migration:run:prod` | Run pending migrations using `dist/src/database/data-source.js` |
| `pnpm run migration:show:prod` | Show pending |
| `pnpm run migration:revert:prod` | Revert last |

## Rollback testing

On a **throwaway** database:

```bash
pnpm run migration:verify-rollback
```

This runs `migration:run` → `migration:revert` → `migration:run` to prove the last migration can be rolled back and reapplied.

## Docker / deployment

- Set **`RUN_MIGRATIONS_ON_START=true`** to run `migration:run:prod` in the container entrypoint before the app starts (see `scripts/docker-entrypoint.sh`).
- **Alternatively**, run migrations as a **release phase** or **CI job** against your production/staging `DATABASE_URL` (recommended for zero-downtime strategies).

## CI/CD

GitHub Actions runs migrations before E2E tests and includes a **rollback verification** job. Deployment workflows can run migrations when `DATABASE_URL` / `DATABASE_URL_STAGING` secrets are configured.
