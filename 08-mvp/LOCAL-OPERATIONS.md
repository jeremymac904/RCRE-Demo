# Local RCRE operations

Existing root: `/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE`.
Canonical app: `apps/rcre-demo`. Execute these commands from the RCRE root:

```sh
node scripts/local.mjs dev
node scripts/local.mjs build
node scripts/local.mjs start
node scripts/local.mjs backup
node scripts/local.mjs check-stopped
```

`dev` and `start` use loopback port3200. Stop the owning terminal with Ctrl-C; do not kill unrelated processes. `build` writes `.next-production` separately from the dev cache. Build mode remains synthetic/local, with FUB and outbound write gates disabled. A private generated FUB key authenticates local protocol fixtures only. A separate local-worker key protects a15-second worker that prepares due approved marketing payloads in the local outbox, with retries and a persisted heartbeat. It cannot publish externally. Both child processes stop with the launcher. Worker logs live in `runtime/logs/local-worker.log`.

Backup creates a consistent SQLite snapshot in `runtime/backups`. New snapshots include a paired `.files` bundle for community attachments, Academy uploads and library assets, with SHA-256 manifest entries. Earlier database-only backups remain labeled accordingly in Local operations health. Keep immutable imported training assets separately. Database restore and binary-file restoration remain separate; no full disaster-recovery claim is made. `check-stopped` is read only and refuses while3200 (or `RCRE_PORT`) is listening. Reset/restore require an explicit confirmation flag and stopped server; do not run them during review.

The destructive reset guard test was rejected by automatic approval review because a race could erase persisted records. The non-destructive `check-stopped` test replaces it; no reset executed in that test. An isolated restore-copy test passed: the canonical production app loaded21 backed-up contacts (18 visible to the selected agent), retained a completed task, and SQLite integrity was OK. No live database was overwritten. Evidence: `verification/restore-copy-results.json`. In-place destructive restore remains untested.

Verification (all cache/temp inside RCRE):

```sh
TMPDIR="$PWD/runtime/tmp" npm_config_cache="$PWD/runtime/cache" npm --prefix apps/rcre-demo run typecheck
TMPDIR="$PWD/runtime/tmp" npm_config_cache="$PWD/runtime/cache" npm --prefix apps/rcre-demo run lint
TMPDIR="$PWD/runtime/tmp" npm_config_cache="$PWD/runtime/cache" npm --prefix apps/rcre-demo test
```

Open `/login` for local synthetic personas: Alex Morgan (Florida Agent), Jordan Ellis (Alabama Agent), Casey Brooks (Alabama Team Leader), Morgan Reed (Managing Broker), Taylor Hayes (Broker Owner), Riley Parker (Florida TC), Avery Lane (Marketing/Admin), Quinn Davis (Trainer). Session duration is12hours; active sessions may be revoked in Account settings. No real SSO, email or production authentication is enabled.

Suggested inspection path: public buyer inquiry → `/financing` calculator/inquiry → Agent Today/contact task → Team Leader handoff → `/agents/u-vito` evidence → TC transaction source/draft/approval/local outbox → `/marketing` private upload/draft/review/schedule → Classroom actual lesson/media/progress → owner website draft/preview/publish.

See `IMPLEMENTATION-REGISTER.md` for unfinished local requirements and exact external boundaries. The production review app is running on3200. See LOCAL-REVIEW-HANDOFF.md for verified results and activation limits.

Hermes lifecycle: `node scripts/hermes-runtime.mjs status rcre-local:u-julio` reads the owner-specific state. The assistant exposes start/stop/status with identity derived from the signed local session. Configuration flags alone cannot supply runtime credentials. Existing permitted local model discovery and an OS isolation probe must pass before starting. The current probe aborted under the installed Python runtime; no actual Hermes request was executed. No shared Hermes state is modified.
