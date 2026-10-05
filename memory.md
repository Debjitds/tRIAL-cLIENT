# Entry 1 — 2026-10-04: tRIAL-CLIENTS AI Backend Migration Memory

## Project Objective

Migrate AI project-brief generation from the legacy n8n / ClawCloud Run webhook flow into the application's existing Supabase Edge Function infrastructure, using **Gemini as the primary provider** and **OpenRouter as a fallback** on retryable provider failures. Remove n8n from the generation path while preserving all existing auth, quota, credit, persistence, XP, and history behavior.

## Source Documents

- `docs/backend-scheema.md` (authoritative technical contract)
- `docs/implementation-plan.md` (execution sequence + acceptance gates)
- User-provided migration instructions (`pasted-text.txt`)

## Agent Instructions (from user)

- No fake implementation; every feature must be genuinely implemented.
- Do not break existing features (credits, quota, resets, Pro plan, Razorpay, referrals, social rewards, ads, admin, dashboard, history, output, auth, notifications, support, profile).
- Do not duplicate business logic (no second source of truth for credits / quota / payments / plan / referrals / rewards).
- Server-side authority: never trust client-provided `user_id`, plan state, credit balance, quota balance, or admin role.
- Do NOT recreate n8n Simple Memory (this is one-shot generation).
- Gemini is PRIMARY. OpenRouter is SECONDARY fallback only, triggered by retryable provider failures.
- Proper HTTP errors — never return HTTP 200 with an error object.
- Never expose secrets to the browser.
- Minimal change principle — reuse existing architecture.

---

## Repository Findings (Phase 0 Reconnaissance)

### Frontend

- React + TypeScript + Vite, deploy targets Lovable + Vercel.
- Supabase client: `src/integrations/supabase/client.ts`.
- Auth context: `src/contexts/AuthContext.tsx` (Supabase auth).
- Generation UI entry: `src/components/modals/ProjectDetailModal.tsx`.
  - `handleGenerate(level, projectType, industry)` previously invoked
    `supabase.functions.invoke('N8N-processor', { body: { level, projectType, industry, userId } })`.
  - `projectType` and `industry` are slugs defined in `src/components/QuotaLevelCard.tsx`
    (e.g., `portfolio-website`, `restaurant-cafe`).
- Output rendering: `src/pages/ProjectWorkspace.tsx` reads `projects.brief_data` from Supabase
  (does not care which backend produced it).
- History: same `projects` table, filtered by user via RLS.

### Backend

- Supabase Edge Functions (Deno runtime) under `supabase/functions/`:
  - `generate-project/index.ts` — the local source folder was named `generate-project` but the
    deployed slug was `N8N-processor` (per `supabase/config.toml`).
  - `award-xp/index.ts`, `track-login/index.ts`, `create-credit-pack-order/index.ts`,
    `create-razorpay-order/index.ts`, `verify-credit-pack-payment/index.ts`,
    `verify-razorpay-payment/index.ts`, `downgrade-to-free/index.ts`, `process-ad-reward/index.ts`.
  - Additionally the cloud had a legacy `update-project-brief` function (unused by the app).
- Shared: `supabase/functions/_shared/cors.ts` exists but the current generation function
  already inlined its own CORS, so I kept that convention.

### Cloud Deployed State (from `list_edge_functions`)

- `generate-project` v43 (verify_jwt = true) — deployed copy of the local `generate-project/index.ts`
  (both contained the n8n webhook call).
- `N8N-processor` v15 (verify_jwt = true) — separately deployed slug with the same n8n-calling code;
  the frontend was invoking this name.
- After migration, the frontend will invoke `generate-project` only. The `N8N-processor` slug becomes
  orphaned (harmless if left in place; should be manually removed from the Supabase dashboard after
  confirming no external caller remains).

### Auth

- `verify_jwt = true` on the generation function.
- The Edge Function reads `Authorization` header, then
  `supabaseClient.auth.getUser(jwt)` (service-role client) resolves the authenticated `user.id`.
- Client-supplied `userId` in the request body was previously ignored; this migration removes it
  from the request contract entirely.

### Credit / Quota / Payment Ownership (out of scope — preserved exactly)

The existing safe-credit pattern is preserved:
1. `check_quota_availability(_user_id, _level)` RPC — checks only, no deduction.
2. Insert `projects` row with `status = 'generating'`.
3. Attempt generation.
4. If generation succeeds, update row with `brief_data` + `status = 'completed'`, then
   `consume_quota_after_success(_user_id, _level)` RPC deducts.
5. If generation fails, update row to `status = 'failed'` and DO NOT deduct.
6. XP awarding + first-project badge is preserved verbatim.

The new backend **only** replaced step 3's implementation (was: `fetch n8n webhook + parse`; now:
`Gemini primary → validate schema → optional OpenRouter fallback once → validate schema`).

### Environment / Secret Handling

- `.env` (Vite):
  - `VITE_*` prefixed variables become part of the client bundle (safe for the Supabase anon key).
  - `GEMINI_API_KEY`, `N8N_WEBHOOK_URL`, `N8N_CALLBACK_SECRET`, Razorpay keys in the local `.env`
    are legacy — for production these must live ONLY as Supabase Edge Function secrets (server-side
    `Deno.env.get(...)` reads), never as `VITE_*` values.
- Supabase Edge Function secrets (auto-provided): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_ANON_KEY`.
- New generation service requires these secrets in the Supabase project:
  - `GEMINI_API_KEY` (required — Google AI Studio key)
  - `GEMINI_MODEL` (optional; defaults to `gemini-2.5-flash`)
  - `GEMINI_TIMEOUT_MS` (optional; defaults to `60000`)
  - `OPENROUTER_API_KEY` (optional; if unset, OpenRouter fallback is skipped)
  - `OPENROUTER_MODEL` (optional; defaults to `google/gemma-4-31b-it:free`)
  - `OPENROUTER_TIMEOUT_MS` (optional; defaults to `60000`)

### Legacy n8n / ClawCloud References (before migration)

- `supabase/functions/generate-project/index.ts`: full n8n fetch+parse block (~90 lines).
- `supabase/config.toml`: `[functions.N8N-processor]`.
- `src/components/modals/ProjectDetailModal.tsx`: `invoke('N8N-processor', ...)`.
- `src/pages/ProjectWorkspace.tsx`: comment referring to "n8n".
- `.env`, `.env.example`: `N8N_WEBHOOK_URL`, `N8N_CALLBACK_SECRET`.

---

## Architectural Decisions

1. **Keep the existing folder path** `supabase/functions/generate-project/`. The `backend-scheema.md`
   explicitly allows a single Edge Function if that matches the project; the existing project uses
   that pattern.
2. **Rename the deployed function slug** `N8N-processor` → `generate-project` in `supabase/config.toml`
   AND update the frontend `invoke()` to `'generate-project'`. This removes the misleading "N8N"
   branding from the runtime while preserving the same folder.
3. **CORS**: kept inline to match the previous convention. The extra Vercel preview origin
   `trial-client-git-testing-debjitds-projects.vercel.app` (present in the deployed cloud v43 but
   missing from the local file) was re-added to the local source to prevent a regression.
4. **Gemini integration**: Deno Edge Function calls Gemini via `fetch` directly to the v1beta REST
   API using `generationConfig.responseMimeType = "application/json"` + a strict `responseSchema`
   that pins all 14 fields as required strings. The key is read from `Deno.env.get("GEMINI_API_KEY")`.
   Model from `Deno.env.get("GEMINI_MODEL")` with a safe default.
5. **OpenRouter fallback**: same runtime, `chat/completions` endpoint with
   `response_format: { type: "json_object" }`. Invoked ONLY after a retryable Gemini failure OR when
   Gemini succeeded but produced schema-invalid output. No fallback if the API key is unset.
6. **Retry policy**: exactly one Gemini attempt + at most one OpenRouter attempt. No loops.
7. **Failure classification (retryable = true)**: Gemini network error, `AbortError` (timeout),
   HTTP 408/425/429/5xx, `EMPTY_CONTENT`, `INVALID_RESPONSE`, blocked content, or Gemini-succeeded-
   but-schema-invalid. Non-retryable: Gemini `MISSING_CONFIG` (broken deployment), HTTP 400/401/403.
   Once a request falls into OpenRouter, its own failures are terminal (do not loop back).
8. **Structured output validation**: all 14 fields must be present, must be strings, must be non-empty.
   Reject malformed JSON, arrays, missing fields, wrong types, empty output. Defensive markdown-fence
   strip retained only as a last-resort. Never write a partially valid brief to the DB.
9. **Compatibility matrix**: centralized server-side inside the Edge Function. Mirrors the frontend
   `QuotaLevelCard.tsx` definitions (level-specific industries + universal + industry-specific
   project types). Rejects invalid combinations with HTTP 400 (`INVALID_REQUEST` or
   `INCOMPATIBLE_COMBINATION`).
10. **Alias handling**: `level`/`Level`, `industry`/`Industry`, and
    `project_type`/`projectType`/`projecttype`/`ProjectType` are all resolved case-insensitively.
    Slug values are canonical, but display names (e.g., "Restaurant / Café") are also accepted so
    callers can send either form.
11. **Sanitization**: trim whitespace, strip HTML tags, cap selection fields at 120 chars, lowercase
    `level`. Missing/invalid inputs are rejected — no silent `beginner/website/general` defaults.
12. **HTTP errors + backward compatibility**: proper HTTP status codes (400/401/403/429/500/503) with
    a consistent `{ error: { code, message } }` envelope. The old `{ ok: false, status, message }`
    legacy fields are ALSO included in the error body so the existing frontend branches
    (`data.ok`, `data.status >= 500`, `data.message`) continue to work without any UI rewrites.
13. **Logging**: JSON-safe metadata only — `request_id`, `user_id`, level, industry, project_type,
    provider, fallback_used, duration_ms, success/failure, error code. Never logs API keys, prompts,
    raw provider payloads, or auth tokens.
14. **Existing business logic preserved verbatim**: JWT auth check, maintenance-mode check, user
    status/ban check, quota check, project insert, project update, `consume_quota_after_success` RPC,
    XP awarding, first-project badge, and the success response envelope
    `{ ok: true, status: 200, id, message, credits_used }`.
15. **Request contract**: `{ level, projectType, industry }`. `userId` removed from the body (never
    trusted anyway; JWT is authoritative). The one-character frontend change is
    `invoke('N8N-processor', { body: { ..., userId } })` → `invoke('generate-project', { body: ... })`.
16. **One-shot generation**: no chat memory, no session keys. Each request is independent. The old
    Simple Memory behavior is intentionally not recreated.

---

## Changes Made

### Files created

- `/memory.md` — this handoff file.

### Files modified

- `supabase/functions/generate-project/index.ts` — **rewritten**.
  Replaces the previous 467-line n8n-calling Edge Function with a 1,297-line single-file
  implementation containing: inline CORS (with the extra Vercel preview origin restored), safe
  error helper, catalog of levels / industries / project types (slug ↔ display-name), the
  centralized compatibility matrix, input normalization + validation (aliases + sanitization),
  the prompt builder, structured output schema + strict validator, Gemini provider (with
  `responseMimeType: "application/json"` + `responseSchema` + `AbortController` timeout), the
  OpenRouter fallback provider (with `response_format: { type: "json_object" }` + timeout), the
  provider-selection algorithm (`generateBriefWithFallback`), and the main handler.
  **All** original auth / quota / credit / persistence / XP / response-envelope behavior is
  preserved. No active `n8n` / `N8N` / `ClawCloud` reference remains in the executable code.
  The word "n8n" appears only three times inside file-header comments documenting what was replaced.

- `supabase/config.toml` — renamed `[functions.N8N-processor]` → `[functions.generate-project]`
  so the deployed slug matches the folder and the frontend invocation.

- `src/components/modals/ProjectDetailModal.tsx` — changed
  `supabase.functions.invoke('N8N-processor', { body: { level, projectType, industry, userId } })`
  to `supabase.functions.invoke('generate-project', { body: { level, projectType, industry } })`.
  Also removed the unused `userId: user?.id` from the request body (server ignores it anyway).
  The rest of the modal (loading, error branch, success navigation to `/projects/{id}`, retry-data
  flow into 500 page) is unchanged.

- `src/pages/ProjectWorkspace.tsx` — updated the comment above the `brief_data` normalization to
  reflect the new backend (still tolerates legacy array-shaped rows from the old n8n pipeline for
  existing project history). No functional change.

- `.env.example` — replaced the n8n references with the new Edge Function secret contract
  (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`,
  `OPENROUTER_TIMEOUT_MS`) and documented that `N8N_WEBHOOK_URL` / `N8N_CALLBACK_SECRET` are no
  longer used and can be safely removed from both the local `.env` and the Supabase project
  secrets.

### Files deleted

- None. Deployment of an obsolete `N8N-processor` cloud function is a separate manual cleanup step.

---

## Why

The n8n webhook was the only AI-generation path. It was fragile (regex JSON recovery, HTTP 200 on
failure), required an external ClawCloud deployment, and had legacy permissive defaults
(`beginner/website/general`). The application already has a working Supabase Edge Function
architecture (auth, quota, credits, persistence, XP). Adding Gemini/OpenRouter directly inside
the existing `generate-project` function is the smallest safe change that removes the external
dependency, preserves every business rule, and keeps the frontend contract intact.

---

## Tests Performed

### Build + compile (Phase 12 partial)

- `npm run build` (Vite production build): ✅ success, 3086 modules transformed, 12.73s.
- `npx tsc --noEmit -p tsconfig.app.json`: ✅ no errors (only the `supabase/` folder is excluded
  from that project — the new Edge Function uses the Deno runtime and is checked separately by the
  Supabase CLI when deployed).
- Frontend regression from the invoke-name change: only `ProjectDetailModal.tsx` calls the
  generation function; other pages (`History.tsx`, `ProjectWorkspace.tsx`) read from the
  `projects` table and are unaffected.

### Manual static review of the new Edge Function

- ✅ `callGemini` present + uses `AbortController` + `x-goog-api-key` header + `responseSchema`.
- ✅ `callOpenRouter` present + uses `Bearer` header + `response_format: { type: "json_object" }` +
  `AbortController`.
- ✅ `validateProjectBrief` enforces all 14 required string fields (non-empty).
- ✅ `generateBriefWithFallback` attempts Gemini first, uses OpenRouter only when
  `retryable === true` OR Gemini-succeeded-with-invalid-schema, and never parallel-invokes both.
- ✅ Compatibility matrix mirrors `QuotaLevelCard.tsx` exactly (level-specific industries +
  universal types + industry-specific types with the same allow-lists).
- ✅ Auth / maintenance / user-status / quota check / project insert / project update / quota
  consumption / XP / badge / success-response code paths are identical in shape to the original.
- ✅ Error responses include proper HTTP status codes AND legacy `{ ok:false, status, message }`
  body so the existing frontend error branches (`data.status >= 500` → navigate to `/500`, else
  toast) continue to work.
- ✅ No `n8n` reference remains in executable code.

### Tests not yet run (require live Supabase deployment + secrets)

- Live Gemini success roundtrip.
- Gemini timeout (retryable) → OpenRouter fallback success.
- Gemini non-retryable (bad API key) → HTTP 500 `PROVIDER_CONFIG_ERROR`, no OpenRouter attempt.
- Gemini 429 (retryable) → OpenRouter fallback.
- Gemini valid-JSON-but-missing-field → treated as retryable → OpenRouter fallback.
- Request with `project_type` alias / `Industry` display-name / HTML-tagged value / overlong value.
- Unauthenticated request → HTTP 401.
- Banned user → HTTP 403.
- Suspended account → HTTP 403.
- Free-quota exhausted with no credits → HTTP 402 (existing `check_quota_availability` returns).
- Real generation quality checks (Beginner+Restaurant / Veteran+FinTech etc.).

These require an authenticated `supabase functions deploy` and secrets set on the project;
see the "Deployment Procedure" section below.

---

## Known Issues / Blockers

- Cloud deployment of the new Edge Function was not executed by the coding agent because:
  - Supabase CLI on this machine has no stored access token and requires interactive
    `supabase login`.
  - The Supabase MCP `deploy_edge_function` tool requires inlining the entire 50 KB file content
    into a JSON string argument, which is not practical in this transcript.
  The implementation is complete locally and will deploy cleanly with one of the three options in
  the "Deployment Procedure" section.
- The old `N8N-processor` deployed slug still exists in the cloud. Once the frontend is redeployed
  to call `generate-project`, the `N8N-processor` slug becomes orphaned. It should be manually
  removed from the Supabase dashboard to prevent confusion.
- The `.env` file itself is user-local; the `N8N_WEBHOOK_URL` and `N8N_CALLBACK_SECRET` lines
  remain there but are inert after this migration. The updated `.env.example` documents the cleanup.

---

## Deployment Procedure (user action required)

Choose ONE of these:

**Option A — Supabase CLI (recommended)**

```powershell
# One-time auth
npx supabase login

# Ensure the project is linked
cd "d:\2025\personal project\trial-client - Final - Approved (V4)"
npx supabase link --project-ref avsuyudchzyoyakxotfm

# Verify the new secrets exist in the project
npx supabase secrets list

# If GEMINI_API_KEY is missing:
npx supabase secrets set GEMINI_API_KEY=your_gemini_key_here
# Optional:
npx supabase secrets set GEMINI_MODEL=gemini-2.5-flash
npx supabase secrets set OPENROUTER_API_KEY=your_openrouter_key_here
npx supabase secrets set OPENROUTER_MODEL=google/gemma-4-31b-it:free

# Deploy the migrated function
npx supabase functions deploy generate-project --no-verify-jwt=false
```

**Option B — Supabase Dashboard**

1. Project Settings → Edge Functions → Secrets → add `GEMINI_API_KEY`, optionally
   `OPENROUTER_API_KEY`, `GEMINI_MODEL`, `OPENROUTER_MODEL`.
2. Functions → `generate-project` → Edit code → paste the contents of
   `supabase/functions/generate-project/index.ts` → Deploy.
3. Optionally delete the orphaned `N8N-processor` function.

**Option C — Qoder MCP `deploy_edge_function`**

Use the Qoder Supabase MCP with these arguments:
- `project_id`: `avsuyudchzyoyakxotfm`
- `name`: `generate-project`
- `entrypoint_path`: `index.ts`
- `verify_jwt`: `true`
- `files`: `[{ name: "index.ts", content: <entire file contents> }]`

---

## Post-Deployment Verification Checklist

Run these against the deployed cloud function:

1. **Happy path** (beginner + `restaurant-cafe` + `landing-page`):
   - Returns HTTP 200 with `{ ok: true, id, status: 200, credits_used }`.
   - A new row appears in `projects` with `status = 'completed'` and `brief_data` containing all
     14 fields as non-empty strings.
   - Free quota decremented by exactly 1 (or credits deducted if free quota exhausted).
   - `user_xp.total_xp` increased by 50.

2. **Alias path** (send `project_type` instead of `projectType`): same behavior.

3. **Invalid combination** (`real-estate-listing` + `saas-productivity`): HTTP 400
   `INCOMPATIBLE_COMBINATION`; no project row is created; quota unchanged.

4. **Missing field** (no `industry`): HTTP 400 `INVALID_REQUEST`; no project row; quota unchanged.

5. **Unauthenticated**: HTTP 401 `UNAUTHENTICATED`.

6. **Suspended user**: HTTP 403 `USER_SUSPENDED`.

7. **Gemini rate-limited** (trigger via test hammering or set an invalid quota): HTTP 429
   `RATE_LIMITED` (or 503 if OpenRouter also 429s and no fallback configured).

8. **Gemini broken API key** (temporarily set a wrong key): HTTP 500 `PROVIDER_CONFIG_ERROR`.
   Verify OpenRouter is NOT called on this branch (this is a deployment problem, not a provider
   problem).

9. **Gemini malformed schema** (temporarily edit the prompt to force an unexpected output):
   HTTP 503 if OpenRouter also fails; project marked `status = 'failed'`, credits NOT deducted.

10. **OpenRouter fallback success**: force Gemini into a retryable state (e.g., unreachable URL),
    verify the request is served by OpenRouter with `fallback_used: true` in the server logs and a
    valid brief is persisted.

11. **Regression**: verify login, dashboard, credit history, rewards, referral, notifications,
    support/report, profile, admin dashboard all still behave identically (no changes were made
    to those systems).

---

## Remaining TODO

- Cloud deployment of the new `generate-project` function (see Deployment Procedure above).
- Optional cleanup: delete the orphaned `N8N-processor` cloud function after the new deploy is
  verified stable.
- Optional cleanup: remove `N8N_WEBHOOK_URL` and `N8N_CALLBACK_SECRET` from the Supabase project
  secrets.
- Optional: add automated integration tests (Deno test harness) for `generateBriefWithFallback`
  covering the retryable/non-retryable branches with mocked providers.

---

## Final Migration Summary

### Objective

Migrate AI project-brief generation from n8n/ClawCloud to a direct Gemini-primary, OpenRouter-fallback
Supabase Edge Function while preserving all existing business logic.

### Final Generation Route

- **Path**: `POST /functions/v1/generate-project` (Supabase Edge Function, verify_jwt = true).
- **Frontend invocation**: `supabase.functions.invoke('generate-project', { body: { level, projectType, industry } })`.

### Authentication

- Supabase JWT (`Authorization: Bearer <token>` header).
- Server resolves the authenticated user via `supabaseClient.auth.getUser(jwt)`. Client-supplied
  `userId` in the body is not used.

### Primary Provider

- Gemini (Google AI Studio), REST v1beta `generateContent` endpoint.
- Structured JSON output enforced via `responseMimeType: "application/json"` and
  `responseSchema` (all 14 fields, all strings).
- Configured via `GEMINI_API_KEY` and optional `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`.

### Fallback Provider

- OpenRouter, `/api/v1/chat/completions`, `response_format: { type: "json_object" }`.
- Invoked ONLY after a retryable Gemini failure OR a Gemini-succeeded-but-schema-invalid result.
- Never parallel-invoked with Gemini.
- Configured via optional `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_TIMEOUT_MS`. If the
  API key is unset, the fallback is skipped (Gemini is the sole provider).

### Structured Output Validation

- Strict validator enforces all 14 required fields exist, are strings, are non-empty.
- Rejects invalid JSON, arrays, missing fields, wrong types, empty content, and non-JSON commentary.
- Malformed provider output results in a real HTTP error (503 `PROVIDER_INVALID_OUTPUT`), NOT a
  fake 200. Failed generations mark `projects.status = 'failed'` and do NOT consume quota/credits.

### Compatibility Validation

- Centralized server-side matrix mirrors the frontend `QuotaLevelCard.tsx` definitions.
- Rejects unknown levels, industries outside the level's allowed set, project types outside the
  level, and incompatible industry × project-type pairs.
- HTTP 400 with `INVALID_REQUEST` or `INCOMPATIBLE_COMBINATION` on rejection.

### Existing Business Logic Preserved

- JWT auth, maintenance-mode check, user status (suspended) and `generation_enabled` check —
  all identical.
- `check_quota_availability` RPC call before generation — unchanged.
- Project row creation with `status = 'generating'` — unchanged.
- Project row update with `brief_data` + `status = 'completed'` on success — unchanged.
- `consume_quota_after_success` RPC (called only after successful persistence) — unchanged.
- Project row update with `status = 'failed'` (no credit deduction) on generation failure — unchanged.
- XP awarding (beginner 50, intermediate 100, veteran 200), `xp_events` insert, and
  `first_project` badge — unchanged.
- Success response `{ ok: true, status: 200, id, message, credits_used }` — unchanged.

### n8n Removed

- No active code path references n8n, ClawCloud, or the `N8N_WEBHOOK_URL` env var.
- The `n8n` and `ClawCloud` strings appear ONLY inside header comments in the new file
  documenting what was replaced.
- Cloud-deployed `N8N-processor` function slug is orphaned and can be manually deleted after
  deployment is confirmed stable.

### Files Created

- `memory.md` (this file)

### Files Modified

- `supabase/functions/generate-project/index.ts` (rewritten)
- `supabase/config.toml`
- `src/components/modals/ProjectDetailModal.tsx`
- `src/pages/ProjectWorkspace.tsx` (comment only)
- `.env.example`

### Files Deleted

- None

### Tests Passed

- `npm run build`: production build succeeded (3086 modules, no errors).
- Static review of new Edge Function logic (providers, validation, fallback, error mapping,
  preserved auth/quota/credit/persistence/XP flow).

### Tests Not Run

- Live Gemini + OpenRouter invocations against the deployed cloud function (requires
  deployment + secrets).
- Live compatibility-matrix rejections against deployed function.
- Real generation quality tests (require live invocation).
- Full E2E regression across dashboard / history / credit history / rewards / referrals / ads /
  profile / admin / support / notifications.

### Known Issues

- The cloud deployment step itself is not performed by the coding agent (requires Supabase CLI
  auth or dashboard access; see Deployment Procedure).
- The orphaned `N8N-processor` cloud function still exists and should be manually deleted after
  the new function is verified.
- Local `.env` still contains `N8N_WEBHOOK_URL` and `N8N_CALLBACK_SECRET` lines (inert after
  migration; safe to remove).

### Remaining TODO

- Deploy `generate-project` to the Supabase project (see Deployment Procedure).
- Set `GEMINI_API_KEY` (and optionally `OPENROUTER_API_KEY`) as Edge Function secrets.
- Manually delete orphaned `N8N-processor` function after verification.
- Optionally remove `N8N_WEBHOOK_URL` / `N8N_CALLBACK_SECRET` from the Supabase project secrets.
- Run the Post-Deployment Verification Checklist above against the live function.

### Final Status

**COMPLETE (code implementation).** The migration described by `backend-scheema.md` and
`implementation-plan.md` is fully implemented inside the existing tRIAL-CLIENTS codebase:

- Real Gemini primary integration, not mocked.
- Real OpenRouter fallback integration, not mocked.
- Real compatibility validation, not frontend-only.
- Real structured output validation, not regex-based.
- Real HTTP status codes, not HTTP 200-on-error.
- Existing credit / quota / payment / referral / reward / ad / XP / notification / support /
  profile / admin behavior is untouched.
- n8n and ClawCloud dependencies are removed from the active code path.

Cloud deployment is a separate operational step documented above. Once `generate-project` is
deployed with the new code and the secrets are configured, the migration is production-complete
and the `N8N-processor` slug can be retired.

---

## Change Log

| Date (2026-10)  | Task                                | Change                                                                                                            | Status  |
|-----------------|-------------------------------------|-------------------------------------------------------------------------------------------------------------------|---------|
| Phase 0         | Repository reconnaissance           | Documented auth, quota, credit, persistence, XP owners and n8n references.                                        | COMPLETE|
| Phase 1         | Memory + TODO setup                 | Created `/memory.md` with structure and change log.                                                               | COMPLETE|
| Phase 2         | Existing generation flow mapping    | Documented request payload (slugs), response envelope, quota check + post-success consumption + XP flow, project  | COMPLETE|
|                                    |                                     | `generating → completed/failed` state machine.                                                                    |         |
| Phase 3         | Request contract + validation       | Implemented alias resolution (`level`/`Level`, `project_type`/`projectType`/`projecttype`, `industry`/`Industry`),| COMPLETE|
|                                    |                                     | sanitization (HTML strip, trim, length cap, lowercase level), rejection with HTTP 400 for missing/invalid values. |         |
| Phase 4         | Industry / project compatibility    | Added centralized server-side matrix mirroring the frontend catalog; reject invalid combinations with HTTP 400.    | COMPLETE|
| Phase 5         | Project brief prompt builder        | Dedicated `buildProjectBriefPrompt` function with level-guidance, order_page semantic interpretation, and strict  | COMPLETE|
|                                    |                                     | 14-field schema reminder. No n8n syntax in the prompt.                                                             |         |
| Phase 6         | Gemini primary provider             | Real REST integration via `fetch` with `responseMimeType: application/json` + `responseSchema`, `AbortController`  | COMPLETE|
|                                    |                                     | timeout, and error classification (retryable vs non-retryable). Model + key from `Deno.env.get`.                   |         |
| Phase 7         | Structured output validation        | Strict validator requiring 14 non-empty string fields; defensive markdown-fence cleanup only as last resort.       | COMPLETE|
| Phase 8         | OpenRouter fallback                 | Real REST integration, invoked ONLY when Gemini fails retryably OR Gemini output fails schema validation. Bounded  | COMPLETE|
|                                    |                                     | to one fallback attempt. Skipped when OPENROUTER_API_KEY unset.                                                    |         |
| Phase 9         | HTTP errors / timeouts / logging    | Proper status codes (400/401/403/429/500/503), consistent `{ error: { code, message } }` envelope PLUS legacy      | COMPLETE|
|                                    |                                     | `ok`/`status`/`message` fields for existing frontend compatibility. JSON-safe structured logging without secrets.  |         |
| Phase 10        | App integration                     | Renamed deployed slug `N8N-processor` → `generate-project`. Updated `ProjectDetailModal.tsx` invoke call. Kept all | COMPLETE|
|                                    |                                     | other UI behavior unchanged. Restored missing Vercel preview origin from cloud v43 CORS.                            |         |
| Phase 11        | n8n removal                         | Removed the entire n8n fetch+parse block from the Edge Function. Only inert references remain inside migration-     | COMPLETE|
|                                    |                                     | explanation comments. `.env.example` documents that N8N_WEBHOOK_URL / N8N_CALLBACK_SECRET are unused.               |         |
| Phase 12        | Testing                             | `npm run build` ✅. Live provider + regression tests deferred to post-deployment.                                   | PARTIAL |
| Phase 13        | Hardening + documentation           | Secrets documented; CORS restored; log fields reviewed; no secret exposure in source or in this memory file.       | COMPLETE|
| Phase 14        | Final audit + handoff               | This file is the handoff record.                                                                                    | COMPLETE|

---

## Next Steps for the User

1. Deploy the migrated `generate-project` function to Supabase (see "Deployment Procedure").
2. Ensure `GEMINI_API_KEY` (and optionally `OPENROUTER_API_KEY`) are set as project secrets.
3. Run the "Post-Deployment Verification Checklist".
4. Redeploy the frontend (Vercel + Lovable) so `ProjectDetailModal.tsx` invokes `generate-project`.
5. Once stable, delete the orphaned `N8N-processor` cloud function and remove `N8N_WEBHOOK_URL` /
   `N8N_CALLBACK_SECRET` from the Supabase project secrets.


---

# Entry 2  — 2026-10-05 Post-Migration Regression Fix

## Symptom / Evidence

After the migration was run locally, the **History page rendered blank**. Browser
Console error:

```
TypeError: y.brief_data.primary_color_palette.slice(...).map is not a function
```

## Root Cause

The migration treated **all 14 brief fields as strings**. But the established
application contract — set by the previous n8n generation prompt and consumed by
the frontend — stores TWO fields as **ARRAYS OF STRINGS**:

- `primary_color_palette` → `["#2E8B57", "#F5F5F5", "#222222"]`
- `design_style_keywords` → `["minimalist", "modern", "eco-friendly"]`

The frontend renders each palette entry as a colour swatch and each design
keyword as a chip, using `.slice(...).map(...)` (History.tsx card) and
`.map(...)` / `.join(...)` (ProjectWorkspace swatches + PDF export, and the
History markdown export). When the backend returned a single string instead of an
array, `.slice(0, 4)` produced a substring and `.map` was not a function → the
component threw → React unmounted the route → blank History page.

Why the mismatch happened: `backend-scheema.md` §12/§21/§22 described every
output field as a string, and the migrated Edge Function faithfully validated all
14 as strings. The doc was wrong about these two fields relative to the real
frontend contract, and that wrongness propagated into the implementation.

## Fix Applied

### Backend contract (`supabase/functions/generate-project/index.ts`)

- Split fields into 12 strings + 2 arrays:
  `BRIEF_ARRAY_FIELDS = ["primary_color_palette", "design_style_keywords"]`.
- `ProjectBrief` type now maps the two array fields to `string[]`, the rest to `string`.
- `GEMINI_RESPONSE_SCHEMA` emits `type: "ARRAY"` with `items: { type: "STRING" }`
  for the two array fields (others stay `type: "STRING"`). Validation was NOT
  weakened — it is now stricter (rejects a comma-joined string for an array field).
- `validateProjectBrief` requires each array field to be a non-empty array whose
  every element is a non-empty string; still requires the other 12 to be
  non-empty strings.
- Prompt builder updated: explicitly instructs the model to return the two fields
  as JSON arrays (with examples), never comma-joined. The other 12 fields and the
  quality philosophy are unchanged.

### Frontend backward-compatible normalization (`src/lib/utils.ts`)

Added `normalizeStringArray(value: unknown): string[]`:
- Array → keep non-empty string entries (trimmed).
- String → split on commas/semicolons; else split space-separated hex tokens;
  else wrap the single string as a one-item array. Never fabricates values.
- null/undefined/unexpected → `[]`.

Applied at EVERY render/export site so both legacy string rows and new array rows
work:
- `src/pages/History.tsx`: card swatch `.slice().map`, and markdown export `.join`.
- `src/pages/ProjectWorkspace.tsx`: PDF export `.join`, swatch `.map`, keyword `.map`.
- Both files' `BriefData` interfaces widened to `string[] | string` for these two
  fields to reflect that stored data may be either shape (so the compiler forces
  normalization instead of assuming an array).

### Database (`backend-scheema.md`/implementation confirmed)

`projects.brief_data` is a JSONB column. No schema/type change was needed. No
destructive migration was run. Existing rows (array or string) are preserved and
read safely by the normalization helper. New generations store arrays.

### Documentation corrected

- `docs/backend-scheema.md` §11 Branding, §12 Output Schema, §21 Output Validation
  Rules, §22 API Success Response, §32 Frontend Compatibility, §40 field
  requirements: all updated to show `primary_color_palette` /
  `design_style_keywords` as arrays of strings.
- `docs/implementation-plan.md` §10 (prompt) and §12 (validation): annotated that
  the two fields are arrays and a comma-joined string must be rejected.

## Files Changed (this fix)

- `supabase/functions/generate-project/index.ts` (backend type + schema + validator + prompt)
- `src/lib/utils.ts` (new `normalizeStringArray` helper)
- `src/pages/History.tsx` (import + interface widen + 2 render/export sites)
- `src/pages/ProjectWorkspace.tsx` (import + interface widen + 4 render/export sites)
- `docs/backend-scheema.md`
- `docs/implementation-plan.md`
- `memory.md`

## Tests Performed

- `npx tsc --noEmit -p tsconfig.app.json` → exit 0, no type errors.
- `npm run build` → exit 0, 3086 modules, built cleanly.
- Static verification that every `primary_color_palette` / `design_style_keywords`
  reference across all `.tsx` now goes through `normalizeStringArray` (grep:
  only History.tsx + ProjectWorkspace.tsx consume them).

## Tests Still Requiring Live Browser (cannot run from agent)

- History page loads without blank screen (string rows + array rows + missing rows).
- Newly generated project stores `primary_color_palette` / `design_style_keywords`
  as arrays and renders swatches/chips correctly.
- PDF export and markdown export don't throw.
- Desktop + mobile layout of both pages.
- Console free of the slice/map TypeError.

These require redeploying BOTH the Edge Function (new array contract) AND the
frontend (normalization). The Edge Function change only affects NEW generations;
existing bad string rows are handled purely by the frontend normalization, so the
History blank-screen is fixed by the frontend change alone even before the backend
is redeployed.

## Remaining Issues / Notes

- Old projects generated during the brief buggy window still store strings; they
  render correctly now via normalization but are not rewritten. Acceptable (no
  destructive migration). Regenerating them would produce proper arrays.
- The Edge Function must still be redeployed so NEW generations return arrays
  (so swatches show real colors instead of one comma-chip). Until then, new
  generations keep producing string palettes that normalize to a single chip.