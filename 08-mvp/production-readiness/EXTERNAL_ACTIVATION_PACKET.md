# RCRE production external activation packet

This packet groups the remaining outside-project inputs. Do not paste secret values into GitHub, issues, chat, or this document. Use the existing private Netlify environment or the approved secret manager. Local code and mock verification can proceed without these values; activation and live verification cannot.

## A. Hosted PostgreSQL and private object storage

- **Service:** the existing RCRE Supabase project (PostgreSQL plus Supabase Storage), or a compatible managed PostgreSQL service only if Supabase is unavailable.
- **Values:** project URL (`SUPABASE_URL`), server-only service-role key (`SUPABASE_SERVICE_ROLE_KEY`), private bucket name (`RCRE_STORAGE_BUCKET`), bucket privacy confirmation (`RCRE_STORAGE_BUCKET_PRIVATE=true`), PostgreSQL connection string (`DATABASE_URL`) using a least-privilege runtime role, and a private self-hosted ClamAV daemon (`RCRE_CLAMAV_HOST`, optional `RCRE_CLAMAV_PORT`, default `3310`) reachable only over the trusted service network. Configure `RCRE_ORGANIZATION_ID` with the verified brokerage UUID. Keep migration-owner credentials separate from runtime credentials. The production upload adapter now uses ClamAV INSTREAM and fails closed on timeout, scanner error, or missing endpoint. Do not expose clamd to the public internet. Configure a private reachable ClamAV service before enabling uploads.
- **Where obtained:** Supabase project settings: API for project URL/service key; Database for pooled/direct connection string; Storage for bucket setup. Create and confirm the private bucket in the project. Deploy/operate a ClamAV daemon in a private network reachable from the application runtime.
- **Where entered:** private production Netlify environment variables. Apply approved migrations 0001 onward, including 0004 and subsequent corrective migrations, through a controlled migration runner after production compatibility review. Do not add credentials to source files.
- **Cost:** Supabase plan and usage may incur charges; Jeremy must select/approve the plan and retention limits.
- **Activates:** durable users, memberships, profiles, CRM, courses, community, transactions, audit, notification state, MLS configuration, favorites, searches, inquiries, and private files.
- **Launch impact:** core production launch is blocked without a reachable database and private storage. A successful connection probe alone does not verify migrations, RLS, backups, restore, or clean/infected ClamAV upload behavior.
- **Operational follow-up:** enable a documented backup/PITR retention policy and complete a restore drill. Provide the backup retention period and recovery contact. Current session cannot execute a live Postgres restore: no local PostgreSQL server/client, Docker, or Podman runtime is installed or available, and there are no hosted project credentials. The service-level backup/restore proof remains a post-connection gate.

## B. Google Sign In

- **Service:** Google Cloud OAuth 2.0 Web application for RCRE login; distinct from per-user optional Google Workspace authorization.
- **Values:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` set to `https://<production-host>/api/auth/google/callback` (confirm the exact route/host registered by the current deployment), plus the authorized production origin.
- **Where obtained:** Google Cloud Console → APIs & Services → Credentials. Configure the authorized origin and exact callback URI; set the consent screen and authorized RCRE accounts/testers.
- **Where entered:** private server-side Netlify environment variables. The redirect URI must exactly match the registered URI.
- **Cost:** no direct OAuth fee; Google Workspace and related services may have subscription costs.
- **Activates:** verified login for invited RCRE members, invitation-bound account linking, and production session creation.
- **Launch impact:** production sign-in and first-day agent onboarding are blocked until the OAuth client and approved test identities are configured and the real callback is verified.

## C. OpenRouter free-only web AI

- **Service:** OpenRouter.
- **Values:** `OPENROUTER_API_KEY` for the RCRE server. The implementation must continue to request only `openrouter/free`; no paid model or fallback is permitted.
- **Where obtained:** OpenRouter account settings/API keys. Verify account/provider spending controls independently; do not rely on the application as an account-level billing limit.
- **Where entered:** private server-side Netlify environment variable only.
- **Cost:** the application allowlist is free-model-only, but account credits/billing state is controlled by OpenRouter; Jeremy should verify provider-side balances and limits.
- **Activates:** live web/portal inference after a synthetic, non-PII smoke test proves the exact requested model and no fallback.
- **Launch impact:** AI can remain clearly unavailable/deterministic until the key is configured; the core portal architecture does not require paid AI.

## D. Invitation and notification email delivery

- **Service:** Resend, using an RCRE-controlled sending domain.
- **Values:** `RESEND_API_KEY`, verified sender address (`RCRE_MAIL_FROM`), and an encryption key for queued invitation payloads (`RCRE_MAIL_OUTBOX_KEY`: 32 random bytes encoded as base64url, exactly 43 characters). The authenticated invitation-mail worker requires `RCRE_JOB_SECRET` (at least 32 random characters); the separate notification worker requires `RCRE_NOTIFICATION_JOB_SECRET` (at least 32 random characters), `RCRE_NOTIFICATION_WORKER_ID` (UUID of an active persisted owner/broker service user), and the brokerage `RCRE_ORGANIZATION_ID` (UUID). Confirm the sender domain’s SPF/DKIM records in DNS and configure an authorized scheduler to invoke each worker endpoint.
- **Where obtained:** Resend dashboard for the API key; generate the outbox encryption key with an approved password/secret generator; domain DNS provider for SPF/DKIM.
- **Where entered:** private server-side Netlify environment variables and the verified DNS zone. Never enter the key in application settings. Worker secrets must be stored as private environment variables and supplied only by the approved scheduler over HTTPS.
- **Cost:** Resend plan/volume may be paid; confirm pricing and sending limits before enabling.
- **Activates:** delivery of invitation and notification outbox messages after queue/de-duplication and delivery receipt behavior are tested. No real email has been sent as part of local verification.
- **Launch impact:** invitations and notices may be durably queued before delivery exists; automatic delivery is blocked until provider verification, worker secrets, active service identity, and scheduler invocation are configured. Failed delivery does not roll back the original brokerage record.

## E. Optional per-user Google Workspace integrations

- **Service:** Google OAuth for Gmail, Calendar, and Drive, separate from Sign In with Google.
- **Values:** `GOOGLE_WORKSPACE_CLIENT_ID`, `GOOGLE_WORKSPACE_CLIENT_SECRET`, `GOOGLE_WORKSPACE_REDIRECT_URI` (production callback: `https://<production-host>/api/integrations/google/callback`), and `RCRE_GOOGLE_TOKEN_ENCRYPTION_KEY` (32-byte base64url key). Enable only the APIs/scopes already declared in the integration code and complete the Google consent configuration.
- **Where obtained:** Google Cloud Console → Credentials and API Library; set consent/verification as required for the selected scopes.
- **Where entered:** private server-side environment for client/encryption secrets; users connect their own Google accounts through the in-app OAuth flow.
- **Cost:** Workspace subscription and any Google service/API charges depend on the account and usage.
- **Activates:** optional Gmail search/read/draft, Calendar read/creation workflows with approval boundary, and private Drive reads/files. Sign In with Google must continue to work if this integration is disconnected.
- **Launch impact:** optional; core RCRE authentication does not depend on mailbox, calendar, or Drive consent.

## F. Error monitoring

- **Service:** Sentry (or another approved error-monitoring service).
- **Values:** `SENTRY_DSN`, plus an organization/project and environment mapping. Keep source-map upload credentials server-side/build-only if enabled.
- **Where obtained:** selected provider’s project settings.
- **Where entered:** private runtime/build environment as appropriate. Configure PII scrubbing before enabling telemetry.
- **Cost:** provider plan/volume may incur charges; choose an approved plan.
- **Activates:** production error visibility beyond the local structured logs and health/readiness surfaces.
- **Launch impact:** important operational quality; local error records and readiness checks can exist without a vendor DSN, but production incident monitoring is not live until tested.

## G. Brokerage and jurisdiction content

- **Source needed:** final broker-approved Alabama and Florida forms, procedures, disclosures, required brokerage/UREG wording, card/signature compliance text, and any official privacy/terms/accessibility text that has not already been verified in the project.
- **Who supplies/approves:** Julio and Taquilla (with the brokerage’s designated compliance reviewer). Supply source files and an approval/version date; do not send credentials in these documents.
- **Where entered:** internal admin knowledge/training/content library after review; final production copy is published only through the existing approval workflow.
- **Cost:** no platform activation charge identified; legal/compliance review may have its own cost.
- **Activates:** approved state-specific compliance training, production business-card/signature exports, and authoritative brokerage knowledge answers.
- **Launch impact:** the software architecture can be tested with empty/approved fixture content; jurisdiction-specific policy claims and final regulated exports remain blocked until source wording is approved.

## H. Intended RCRE desktop/Hermes source

- **Source needed:** the authorized repository URL and branch/commit for the existing RCRE desktop client, if Jeremy wants the desktop runtime included. The current `RCRE-Demo` repository contains a shared provider contract but not the desktop binary/runtime.
- **Who supplies:** Jeremy or the desktop product owner.
- **Where entered:** work proceeds in that existing repository after source ownership and supported provider authentication flows are verified. Do not copy provider tokens or another application’s private credential files.
- **Cost:** provider subscription terms vary. Use only officially supported account authorization; a subscription does not imply API entitlement.
- **Activates:** desktop packaging and provider login for officially supported account subscriptions.
- **Launch impact:** web production launch is not blocked; desktop runtime inclusion is blocked until the authorized source is identified.
