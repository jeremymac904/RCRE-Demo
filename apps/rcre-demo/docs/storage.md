# RCRE file storage boundary

The server-only storage service is at `src/lib/storage`. Callers provide an authenticated `StorageActor` and a mandatory `StorageAuthorization` policy; the service checks policy on upload, metadata access, download, signed URL creation, and deletion. Do not construct a permissive policy at an API boundary. Carry the organization and role from a trusted server session, never from request JSON.

The service validates per-category size limits, an allowlisted MIME type, and file magic bytes. It computes a SHA-256 digest and preserves private/public classification in the storage manifest. Production uploads fail closed unless a malware scanner is injected and reports a clean result. Scanner errors and infected files reject the upload.

## Local development

`RCRE_OBJECT_STORAGE_PROVIDER=local` selects a filesystem adapter. When omitted, development defaults to local and production defaults to Supabase. Local files are written only beneath `<RCRE project>/runtime/object-storage/`; this is project runtime data and must not be committed. Local signed URLs use `/api/storage/local/:id`, HMAC, and `RCRE_STORAGE_SIGNING_SECRET` (minimum 32 characters). This route is disabled in production. Generate local signed URLs only after the authorization policy approves the request.

## Supabase Storage activation

Set server-only values in the secret manager:

- `RCRE_OBJECT_STORAGE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose with a `NEXT_PUBLIC_` prefix)
- `RCRE_STORAGE_BUCKET` (a private bucket name)
- `RCRE_STORAGE_BUCKET_PRIVATE=true` only after confirming the bucket's actual Supabase configuration is private

The adapter uses a single private bucket for both payload objects and `.rcre-metadata/*.json` manifests. It does not make objects public. Publicly classified assets are still delivered through short-lived signed URLs and require an authorized caller to mint the URL. Signed links expire after at most 900 seconds. The service role key is used only by server-side code; API routes must not expose it or Supabase object paths.

A production bucket's access policy, service-role protection, malware-scanner endpoint, and retention/deletion policy require deployment configuration and verification. The `RCRE_STORAGE_BUCKET_PRIVATE` value is an assertion, not an API verification that Supabase configured the bucket privately. No existing upload workflow is switched to this abstraction by this change; callers must be migrated individually after their domain-specific authorization is wired.
