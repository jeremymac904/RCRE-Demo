# Local PostgreSQL test stack

This stack is disposable development infrastructure only. It binds PostgreSQL to `127.0.0.1:54329`; the literal passwords in Compose and its init SQL are local-only and must never be used in Netlify or any hosted environment.

From `apps/rcre-demo`:

```sh
docker compose -f infra/postgres/docker-compose.yml up -d --wait
DATABASE_URL='postgres://postgres:local_only_postgres_password@127.0.0.1:54329/rcre_local' node src/lib/db/migrate.mjs
RCRE_MIGRATIONS_APPROVED=1 DATABASE_URL='postgres://postgres:local_only_postgres_password@127.0.0.1:54329/rcre_local' node src/lib/db/migrate.mjs --apply
```

The first runner command is inspection-only. The `--apply` command requires the explicit `RCRE_MIGRATIONS_APPROVED=1` acknowledgement. It applies migrations in numeric order, records SHA-256 checksums transactionally, serializes concurrent runs with an advisory lock, refuses edits to already-applied migrations, and is a no-op on a repeat run. Run application tests using the least-privilege `rcre_app` URL after migrations:

```sh
RCRE_PG_INTEGRATION_URL='postgres://rcre_app:local_only_rcre_app_password@127.0.0.1:54329/rcre_local' npm test
```

The application adapter never uses the migration/superuser URL. A mounted production database and its migration state are not established by this local setup.
