# tRIAL-CLIENTS — Backend Migration Implementation Plan

## 0. Document Purpose

This document is the execution plan for implementing the backend defined in `backend-scheema.md` inside the existing **tRIAL-CLIENTS** codebase.

This is an implementation document, not a greenfield architecture proposal. The coding agent must inspect the existing repository first, reuse existing conventions, make the smallest safe changes, verify each phase, and maintain a root-level `memory.md` throughout the work.

The target is:

```text
existing tRIAL-CLIENTS application
        +
new production generation backend
        -
n8n / ClawCloud generation dependency
```

---

# 1. Source of Truth and Priority

Use these in this order:

1. `backend-scheema.md` — authoritative technical/behavioral requirements.
2. Existing application code — authoritative for current routes, auth, persistence, UI contracts, and working business logic.
3. `implementation-plan.md` — implementation sequence, acceptance gates, TODO tracking, and handoff process.

Do not use this migration as an opportunity to redesign unrelated parts of the application.

---

# 2. Non-Negotiable Guardrails

## 2.1 No fake implementation

Every backend behavior must be real and server-enforced.

Do NOT:

- return static/mock project briefs pretending to be AI output;
- simulate Gemini/OpenRouter calls;
- make frontend-only validation the only protection;
- hide provider failures behind successful UI states;
- store a fake project when generation failed;
- keep n8n as the real backend while changing only the UI.

A task is complete only when the underlying implementation actually works.

## 2.2 Preserve existing features

Do not casually change:

- credits;
- free monthly quota;
- quota reset;
- Pro plan;
- Razorpay/payment;
- credit packs;
- referrals;
- social-post rewards;
- ads/reward ads;
- admin billing;
- history;
- authentication;
- dashboard/profile/support/admin behavior.

These are outside this migration unless a minimal integration change is unavoidable.

## 2.3 Do not duplicate business logic

The new generation backend must NOT become a second source of truth for:

- credits;
- quota;
- payment state;
- Pro entitlement;
- referrals;
- rewards.

Existing business logic remains authoritative.

## 2.4 Backend authority

Server-side code must verify:

- authentication;
- request shape;
- level;
- industry/project compatibility;
- provider execution;
- generated-output schema.

Never trust client-supplied user IDs, roles, plan state, quota or credit balances as authoritative.

## 2.5 Mandatory memory file

The agent MUST create:

```text
/memory.md
```

and update it after every meaningful implementation change.

It must record:

- instruction/task;
- files inspected;
- files changed;
- why the change was made;
- tests performed and results;
- status;
- blockers/limitations;
- important architectural decisions;
- next steps.

This is a permanent handoff record for future coding agents.

---

# 3. Target Architecture

```text
Frontend
   |
   | authenticated POST
   v
Existing App Backend / Supabase Edge Function
   |
   | authenticate
   | validate
   | normalize
   | compatibility-check
   v
Prompt Builder
   |
   v
Gemini PRIMARY
   |
   | valid structured JSON
   |------------------------------> return validated brief
   |
   | retryable failure only
   v
OpenRouter SECONDARY FALLBACK
   |
   v
Structured output validation
   |
   v
Return validated brief
```

The finished generation path must not require n8n, ClawCloud Run, n8n AI Agent, n8n Simple Memory, or the old webhook.

---

# 4. Implementation Phases

Execute in this order and do not skip verification gates:

```text
Phase 0  — Repository Reconnaissance
Phase 1  — Memory + TODO Setup
Phase 2  — Existing Generation Flow Mapping
Phase 3  — Request Contract + Validation
Phase 4  — Industry/Project Compatibility
Phase 5  — Project Brief Prompt Builder
Phase 6  — Gemini Primary Provider
Phase 7  — Structured Output Validation
Phase 8  — OpenRouter Fallback
Phase 9  — HTTP Errors / Timeouts / Logging / Security
Phase 10 — Existing App Integration
Phase 11 — n8n Removal
Phase 12 — End-to-End + Regression Testing
Phase 13 — Production Hardening + Documentation
Phase 14 — Final Audit + Handoff
```

---

# 5. PHASE 0 — Repository Reconnaissance

## Goal

Understand the real existing application before modifying it.

## Tasks

### 0.1 Inspect repository

Find:

- frontend root;
- backend root;
- Supabase project/config;
- Edge Functions/API routes;
- shared types;
- auth helpers;
- generation UI;
- project persistence/history;
- environment/deployment files;
- test setup.

### 0.2 Locate current generation caller

Search for:

```text
n8n
generate-brief
webhook
fetch(
axios
supabase.functions.invoke
```

Record the exact request URL/function, HTTP method, payload, auth headers, success parser, and error parser.

### 0.3 Locate current usage/persistence flow

Identify exactly where the app:

- authorizes generation;
- checks free quota;
- checks purchased credits;
- deducts/refunds usage;
- saves a project;
- records history;
- marks success/failure.

Do NOT move this logic.

### 0.4 Locate current auth

Reuse the established app auth/session mechanism. Do not add a second auth system.

### 0.5 Locate secret/deployment mechanism

Identify how server-side secrets are stored for local and production environments.

### Acceptance gate

- [ ] Current generation caller identified.
- [ ] Backend entry point identified.
- [ ] Auth mechanism identified.
- [ ] Credit/quota/usage owner identified.
- [ ] Project persistence owner identified.
- [ ] Secret/deployment mechanism identified.
- [ ] Findings written to `memory.md`.

---

# 6. PHASE 1 — Memory + TODO Setup

## Goal

Establish permanent implementation tracking before code changes begin.

## 1.1 Create `/memory.md`

Initial structure:

```md
# tRIAL-CLIENTS AI Backend Migration Memory

## Project Objective
Migrate AI project brief generation from n8n to the existing application backend.

## Source Documents
- backend-scheema.md
- implementation-plan.md

## Agent Instructions
- Preserve existing working features.
- No fake implementation.
- Gemini primary.
- OpenRouter secondary fallback.
- Do not recreate n8n memory.
- Do not move credit/payment/quota business logic.
- Update this file after meaningful changes.

## Current Repository State
...

## Changes Made
...

## Tests Performed
...

## Known Issues / Blockers
...

## Decisions
...

## Next Steps
...

## Change Log
| Date | Task | Change | Status |
|------|------|--------|--------|
```

## 1.2 Initialize master TODO

Maintain the checklist in this file and keep it synchronized with actual implementation status.

- [ ] P0 — Repository reconnaissance
- [ ] P1 — Memory/TODO setup
- [ ] P2 — Existing generation flow mapping
- [ ] P3 — Request validation
- [ ] P4 — Compatibility validation
- [ ] P5 — Prompt builder
- [ ] P6 — Gemini provider
- [ ] P7 — Structured output validation
- [ ] P8 — OpenRouter fallback
- [ ] P9 — Errors/timeouts/logging/security
- [ ] P10 — App integration
- [ ] P11 — n8n removal
- [ ] P12 — Full testing
- [ ] P13 — Hardening/documentation
- [ ] P14 — Final verification/handoff

### Acceptance gate

- [ ] `memory.md` exists at repo root.
- [ ] TODO tracker initialized.
- [ ] First change-log entry written.

---

# 7. PHASE 2 — Map Existing Generation Flow

## Goal

Understand the current flow end-to-end while preserving ownership boundaries.

Document:

```text
Generate button
   ->
client validation
   ->
request
   ->
current n8n/backend endpoint
   ->
response
   ->
project persistence
   ->
output/history UI
```

Also document failure paths:

```text
invalid request
network failure
provider failure
malformed JSON
persistence failure
```

Verify the existing response fields:

```text
company_name
tagline
slogan
location
primary_color_palette
design_style_keywords
intro
objective
requirement_design
about_page
home_page
order_page
audience
tips
```

### Acceptance gate

- [ ] Current request payload verified.
- [ ] Current response contract verified.
- [ ] Usage/credit/quota location verified.
- [ ] Persistence location verified.
- [ ] Failure behavior documented.
- [ ] `memory.md` updated.

---

# 8. PHASE 3 — Request Contract + Validation

## Goal

Create a production-safe request boundary.

Canonical internal request:

```ts
type GenerateBriefRequest = {
  level: "beginner" | "intermediate" | "veteran";
  industry: string;
  projectType: string;
};
```

## Tasks

Accept compatibility aliases where required:

```text
level / Level
project_type / projectType / projecttype
industry / Industry
```

Normalize:

- trim whitespace;
- lowercase `level`;
- strip HTML tags;
- cap selection fields around 120 characters;
- normalize harmless casing/spacing differences.

Reject missing/invalid values with:

```http
400 Bad Request
```

Do NOT silently fall back to legacy defaults such as:

```text
beginner / website / general
```

### Tests

- valid canonical request;
- valid aliases;
- missing fields;
- invalid level;
- invalid types;
- overlong inputs;
- HTML-tagged inputs;
- malformed JSON/body.

### Acceptance gate

- [ ] Server-side validation works.
- [ ] Aliases work where needed.
- [ ] No silent defaults.
- [ ] Unit tests pass.
- [ ] Existing frontend payload remains compatible.
- [ ] `memory.md` updated.

---

# 9. PHASE 4 — Industry / Project Compatibility

## Goal

Prevent logically invalid combinations on the backend.

The product model is:

> **Industry = business context**
>
> **Project Type = technical solution**

Create ONE centralized compatibility source instead of duplicating rules across components.

## Beginner

Industries:

```text
Personal Branding
Local Business
Blogging & Content
Portfolio & Creative Arts
Education (Students / Tutors)
Restaurant / Café
Fitness & Wellness
Photography
Travel Diaries
Event & Celebrations
```

Project types:

```text
Portfolio Website
Landing Page
Simple Blog Website
Product / Service Showcase Page
Restaurant Menu Website
Gallery / Media Showcase
Contact Form Website
Single-page Personal Bio Site
Event Invitation / Info Website
Basic Info Website (Static)
```

## Intermediate

Industries:

```text
E-commerce & Retail
Healthcare / Fitness
Real Estate
Travel & Hospitality
SaaS / Productivity Tools
Food Delivery & Services
Media & News
HR & Job Platforms
Online Course / Learning
Entertainment & Streaming
```

Project types:

```text
Dashboard / Analytics Panel
Booking or Appointment System
Blogging Platform with CMS
Membership Website
Chat / Messaging Web App
Course Platform (Mini LMS)
E-commerce Website / Shop System
Real Estate Listing Website
Food Delivery Web App
Job Portal / Recruitment System
Travel Booking System
```

## Veteran

Industries:

```text
AI & Machine Learning
FinTech & Investment
EdTech (Large Scale)
Cybersecurity
B2B SaaS
Automation & Workflow Tools
Social Platforms
Healthcare Technology
Marketplace Ecosystems
Media & News
Data & Analytics Companies
```

Project types:

```text
Enterprise Admin Dashboard
Data Visualization & Analytics Platform
Automation Workflow Builder
Subscription / Credit-Based Platform
API-first Platform / Integration Hub
AI Chatbot / Virtual Assistant System
Project Management / Collaboration Tool
AI SaaS Platform
FinTech Dashboard / Portfolio Tracker
Full LMS (Enterprise)
Marketplace Platform (Multi-vendor)
Social Media Platform
Cybersecurity Monitoring System
```

Reject clearly invalid combinations. Examples:

```text
Real Estate Listing Website + Real Estate = valid
Travel Booking System + Travel & Hospitality = valid
Real Estate Listing Website + SaaS / Productivity Tools = reject
```

The exact matrix should be centralized and extensible.

### Acceptance gate

- [ ] Central compatibility source exists.
- [ ] Valid combinations pass.
- [ ] Invalid combinations return HTTP 400.
- [ ] Frontend cannot bypass server validation.
- [ ] Representative valid/invalid tests pass.
- [ ] `memory.md` updated.

---

# 10. PHASE 5 — Project Brief Prompt Builder

## Goal

Preserve the real-world client simulation quality while removing n8n prompt mechanics.

Create a dedicated builder, conceptually:

```text
buildProjectBriefPrompt(input)
```

The HTTP handler should not contain the complete long prompt.

## Prompt must include

```text
Developer Level: ...
Project Type: ...
Industry: ...
```

and the following principles:

- act as an expert AI project brief generator and creative project manager;
- generate a realistic human-like client brief;
- use a fictional but believable company;
- ensure the company fits the selected industry;
- keep all sections connected to the same company/business goal;
- use a professional, practical, slightly creative project-manager/client-proposal tone;
- avoid repetitive AI filler and generic “build a modern website” phrasing;
- match scope to the selected level;
- match business flow to the selected project type;
- produce coherent branding.

The prompt must require exactly:

```text
company_name
tagline
slogan
location
primary_color_palette
design_style_keywords
intro
objective
requirement_design
about_page
home_page
order_page
audience
tips
```

`primary_color_palette` and `design_style_keywords` must be ARRAY OF STRINGS
(the frontend renders them as swatches/chips). The other twelve fields are
single strings. Never coerce the two array fields into a comma-joined string.

`order_page` is a compatibility field. It must describe the relevant primary transaction/conversion/booking/request journey instead of forcing a literal order page in every domain.

### Quality review cases

Generate examples for:

- Beginner + Restaurant / Café;
- Beginner + Personal Branding;
- Intermediate + Real Estate;
- Intermediate + SaaS / Productivity Tools;
- Veteran + FinTech & Investment;
- Veteran + Media & News.

Check internal consistency, realistic scope, business fit, tone, branding, and useful requirements.

### Acceptance gate

- [ ] Dedicated prompt builder exists.
- [ ] Dynamic context is included.
- [ ] Real-world simulation behavior is included.
- [ ] Exact output fields are required.
- [ ] Level-aware complexity is included.
- [ ] `order_page` compatibility is preserved.
- [ ] No n8n syntax exists in the prompt builder.
- [ ] Prompt is never exposed to client.
- [ ] `memory.md` updated.

---

# 11. PHASE 6 — Gemini Primary Provider

## Goal

Implement a real server-side Gemini integration.

Server-side configuration:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

Use the current official server-side Gemini API/SDK supported by the actual runtime.

Create a provider abstraction rather than hard-coding provider-specific response handling into the route.

Conceptual normalized result:

```ts
type ProviderResult =
  | { ok: true; text: string; provider: "gemini" }
  | { ok: false; provider: "gemini"; errorType: string; retryable: boolean };
```

Prefer structured/schema-constrained JSON output when supported by the selected Gemini API/model.

Configure an explicit timeout.

### Acceptance gate

- [ ] Real Gemini request works in a safe environment.
- [ ] Gemini is always first.
- [ ] API key remains server-only.
- [ ] Model is configurable.
- [ ] Timeout exists.
- [ ] Provider result is normalized.
- [ ] Errors are classified.
- [ ] `memory.md` updated.

---

# 12. PHASE 7 — Structured Output Validation

## Goal

Replace fragile n8n parsing with strict runtime validation.

The validator must require:

```text
company_name
 tag-line/slogan/etc...
```

Use the exact 14 required fields from `backend-scheema.md`:

```text
company_name
tagline
slogan
location
primary_color_palette
design_style_keywords
intro
objective
requirement_design
about_page
home_page
order_page
audience
tips
```

Validation types: twelve fields must be non-empty strings; `primary_color_palette` and `design_style_keywords` must be non-empty arrays of strings. Reject a comma-joined string where an array is required.

Processing flow:

```text
provider response
   ->
extract model text
   ->
parse JSON
   ->
validate required fields
   ->
validate field types/non-empty values
   ->
return valid brief
```

A small markdown-fence cleanup may be retained as defensive compatibility, but do not recreate regex extraction as the main parsing strategy.

Reject:

- invalid JSON;
- missing fields;
- wrong types (including a comma-joined string where an array is required);
- empty output;
- obvious non-JSON commentary;
- partial project briefs.

Use the same validator for Gemini and OpenRouter.

### Acceptance gate

- [ ] Runtime schema validator exists.
- [ ] Valid response passes.
- [ ] Missing field fails.
- [ ] Wrong type fails.
- [ ] Invalid JSON fails.
- [ ] Partial output fails.
- [ ] Fenced JSON is handled safely.
- [ ] `memory.md` updated.

---

# 13. PHASE 8 — OpenRouter Secondary Fallback

## Goal

Add controlled resilience without doubling every request.

Configuration:

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
```

Correct behavior:

```text
Gemini
  |
  +-- success + valid JSON --> return
  |
  +-- retryable failure --> OpenRouter once
  |
  +-- non-retryable failure --> error
```

Do NOT call both providers for every generation.

The OpenRouter node in the old n8n export was not connected, so do not blindly copy its old model configuration as though it were proven production behavior. Use a configurable fallback model and verify it can produce the required schema.

Fallback should cover appropriate temporary failures, such as timeout, temporary upstream/server failure, service unavailable, or a suitable provider rate-limit case.

Do NOT use fallback for application validation errors, coding bugs, or clearly broken deployment configuration unless the application's explicit provider-availability policy says otherwise.

Do not create unlimited retries.

### Acceptance gate

- [ ] OpenRouter provider is real.
- [ ] Gemini remains primary.
- [ ] OpenRouter executes only for allowed fallback cases.
- [ ] No parallel dual-provider call by default.
- [ ] Fallback output uses the same validator.
- [ ] One bounded fallback attempt is implemented.
- [ ] Both-provider failure is handled.
- [ ] `memory.md` updated.

---

# 14. PHASE 9 — HTTP Errors / Timeouts / Logging / Security

## HTTP status mapping

| Condition | HTTP |
|---|---:|
| Invalid/missing input | 400 |
| Not authenticated | 401 |
| Not permitted by existing authorization layer | 403 |
| Rate limited | 429 |
| Temporary provider unavailable | 503 |
| Unexpected backend failure | 500 |

Use one consistent error envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Never return HTTP 200 with an error object for generation/provider/parser failures.

## Timeouts

All AI requests must have explicit timeouts.

## Logging

Safe metadata may include:

```text
request_id
safe internal user identifier
level
industry
project_type
provider
fallback_used
duration_ms
success/failure
error_code
```

Never log:

- API keys;
- Authorization headers/tokens;
- unnecessary sensitive data;
- complete prompts by default;
- raw secret-bearing provider payloads.

Do not return stack traces, raw provider payloads, n8n metadata, raw prompts, or credentials to clients.

### Acceptance gate

- [ ] Status mapping works.
- [ ] Error envelope is consistent.
- [ ] Timeout is enforced.
- [ ] Retry policy is bounded.
- [ ] Logs are safe.
- [ ] Secret/debug leakage is prevented.
- [ ] `memory.md` updated.

---

# 15. PHASE 10 — Integrate With Existing App

## Goal

Replace the old generation endpoint while preserving the existing business flow.

### 10.1 Frontend endpoint replacement

Replace only the old generation target:

```text
old n8n webhook
        ->
new app backend / Edge Function
```

### 10.2 Preserve input contract

Continue supporting the existing frontend payload and aliases.

### 10.3 Preserve output contract

Do not rename the 14 existing output fields without a proven need.

### 10.4 Preserve existing usage/persistence

The new backend should return the validated brief. Existing application logic must remain responsible for its established usage/quota/credit/persistence behavior.

If the current architecture combines authorization and generation in one server function, inspect that flow carefully and preserve the business logic rather than duplicating it.

### 10.5 Preserve UI

Do not redesign the dashboard/output page as part of this migration.

Verify:

- desktop generation;
- mobile generation;
- loading state;
- success state;
- failure state;
- project output rendering;
- history/recent-project behavior.

### Acceptance gate

- [ ] Frontend calls new backend.
- [ ] No frontend call to n8n remains.
- [ ] Existing output page renders correctly.
- [ ] Existing history/recent projects work.
- [ ] Existing usage/credit/quota behavior remains intact.
- [ ] No fake client-side workaround was added.
- [ ] `memory.md` updated.

---

# 16. PHASE 11 — Remove n8n Dependency

## Goal

Make n8n/ClawCloud unnecessary for project-brief generation.

Search entire repo for:

```text
n8n
generate-brief
webhook
clawcloud
ClawCloud
old generation URL
```

Remove obsolete code that only existed for the n8n generation path:

- old webhook calls;
- n8n-specific response parsing;
- n8n AI Agent result assumptions;
- n8n memory handling;
- unused credential references;
- obsolete generation environment variables.

Do NOT remove unrelated webhook integrations that belong to other product features.

### Acceptance gate

- [ ] No active generation request uses n8n.
- [ ] No ClawCloud dependency is required.
- [ ] No n8n-specific generation parser is required.
- [ ] No n8n memory is recreated.
- [ ] Unrelated integrations remain intact.
- [ ] `memory.md` updated.

---

# 17. PHASE 12 — End-to-End + Regression Testing

Testing must prove real behavior. Compilation alone is not enough.

## 17.1 Request tests

Test:

```text
Beginner + valid combination
Intermediate + valid combination
Veteran + valid combination
```

Aliases:

```text
level / Level
project_type / projectType / projecttype
industry / Industry
```

Invalid:

```text
missing level
missing industry
missing project type
invalid level
unknown industry
unknown project type
invalid combination
overlong input
HTML input
```

Expected invalid request:

```text
400
```

## 17.2 Auth tests

Verify unauthenticated requests cannot generate.

Expected:

```text
no/invalid auth -> 401
valid auth -> continue
```

## 17.3 Gemini tests

Test:

- valid response;
- timeout;
- temporary provider failure;
- malformed JSON;
- missing output field.

## 17.4 OpenRouter tests

Test:

```text
Gemini retryable failure -> OpenRouter success
Gemini retryable failure -> OpenRouter failure
```

Verify non-retryable errors do not trigger fallback.

## 17.5 Output validation tests

Test:

- all 14 fields present;
- missing field;
- wrong type;
- invalid JSON;
- empty JSON;
- fenced JSON;
- unexpected top-level field.

The final contract should match `backend-scheema.md` and the existing frontend needs.

## 17.6 Real generation-quality tests

Generate and manually inspect representative cases:

```text
Beginner + Restaurant / Café
Beginner + Personal Branding
Intermediate + Real Estate
Intermediate + SaaS / Productivity Tools
Veteran + FinTech & Investment
Veteran + Media & News
```

Check:

- company fits industry;
- project type is represented correctly;
- level complexity is appropriate;
- all sections belong to the same business;
- output reads like a genuine client brief;
- generic filler is limited;
- `order_page` is semantically correct;
- branding is coherent.

## 17.7 Existing-feature regression

Verify at minimum:

- login/signup;
- dashboard;
- generation;
- recent projects/history;
- project output page;
- credit display;
- free quota behavior;
- Pro status;
- Razorpay/payment;
- credit packs;
- referral behavior;
- social rewards;
- notifications;
- support/report;
- admin access;
- profile;
- mobile UI.

If an issue clearly pre-dates the migration, document it in `memory.md` instead of changing unrelated systems just to produce a green result.

### Acceptance gate

- [ ] Validation tests pass.
- [ ] Auth tests pass.
- [ ] Gemini tests pass.
- [ ] Fallback tests pass.
- [ ] Schema tests pass.
- [ ] Quality checks pass.
- [ ] Existing-feature regression is clean or pre-existing issues are documented.
- [ ] `memory.md` updated.

---

# 18. PHASE 13 — Production Hardening + Documentation

## Tasks

### 18.1 Verify secrets

Confirm server-side configuration for:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=...
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
```

Do not commit secret values.

### 18.2 Verify deployment

Confirm the new route/function is deployed and reachable from the real frontend environment.

### 18.3 Verify CORS/security

Use the application's established origin/auth model. Avoid permissive wildcard CORS unless there is an explicit justified need.

### 18.4 Verify logs

Confirm useful errors are diagnosable without revealing secrets or full prompts.

### 18.5 Search for accidental secret leakage

Review source, config, and generated client bundles for secret exposure.

### 18.6 Documentation

Update `memory.md` with:

- final route/function;
- provider setup;
- files created/modified/deleted;
- tests;
- known limitations;
- final status.

### Acceptance gate

- [ ] Secrets verified.
- [ ] Deployment verified.
- [ ] Client/server boundary verified.
- [ ] No credential leakage found.
- [ ] Documentation synchronized.
- [ ] `memory.md` updated.

---

# 19. PHASE 14 — Final Audit + Handoff

The coding agent must perform a final audit before claiming completion.

## Architecture

- [ ] n8n is no longer required.
- [ ] ClawCloud is no longer required.
- [ ] Gemini is primary.
- [ ] OpenRouter is controlled fallback.
- [ ] Simple Memory was not recreated.
- [ ] Generation is one-shot.

## Security

- [ ] Auth is server-verified.
- [ ] API keys are server-side only.
- [ ] Client plan/credit/quota values are not trusted.
- [ ] Prompts/debug data are not exposed.
- [ ] Stack traces are not returned publicly.

## Validation

- [ ] Input schema validated.
- [ ] Compatibility validated.
- [ ] Model output validated.
- [ ] Partial malformed results rejected.

## Reliability

- [ ] AI timeouts exist.
- [ ] Retry behavior is bounded.
- [ ] Fallback behavior is correct.
- [ ] Correct HTTP statuses are returned.

## Existing application

- [ ] Generation UI works.
- [ ] Output page works.
- [ ] Recent projects/history works.
- [ ] Existing credits/quota unchanged.
- [ ] Pro/payment unchanged.
- [ ] Referral/reward systems unchanged.
- [ ] Admin/support functionality unchanged.

## Tracking

- [ ] Root `memory.md` exists.
- [ ] Every meaningful change is recorded.
- [ ] TODO status is current.
- [ ] Final changed-file list is recorded.
- [ ] Known issues are documented.

---

# 20. Master TODO — Keep Updated During Execution

## Discovery

- [ ] P0.1 Inspect repository structure.
- [ ] P0.2 Locate current generation caller.
- [ ] P0.3 Locate auth.
- [ ] P0.4 Locate quota/credit/usage ownership.
- [ ] P0.5 Locate project persistence.
- [ ] P0.6 Locate secrets/deployment.

## Tracking

- [ ] P1.1 Create `memory.md`.
- [ ] P1.2 Initialize TODO.
- [ ] P1.3 Record initial findings.

## Backend implementation

- [ ] P2 Map current generation flow.
- [ ] P3 Implement request normalization.
- [ ] P3 Implement request validation.
- [ ] P4 Implement centralized compatibility matrix.
- [ ] P5 Implement prompt builder.
- [ ] P5 Preserve realistic client-brief quality.
- [ ] P6 Implement Gemini provider.
- [ ] P6 Add timeout/provider classification.
- [ ] P7 Implement exact output schema.
- [ ] P7 Implement JSON parsing/validation.
- [ ] P8 Implement OpenRouter provider.
- [ ] P8 Implement retryable fallback.
- [ ] P9 Implement status/error mapping.
- [ ] P9 Implement safe logging/security.
- [ ] P10 Integrate frontend with new endpoint.
- [ ] P10 Preserve existing usage/persistence boundaries.
- [ ] P11 Remove n8n generation dependency.

## Testing

- [ ] P12 Request tests.
- [ ] P12 Auth tests.
- [ ] P12 Provider tests.
- [ ] P12 Schema tests.
- [ ] P12 Fallback tests.
- [ ] P12 Error-status tests.
- [ ] P12 Real generation quality tests.
- [ ] P12 Regression tests for existing features.

## Finalization

- [ ] P13 Verify production secrets.
- [ ] P13 Verify deployment.
- [ ] P13 Verify security/secret leakage.
- [ ] P13 Verify logs.
- [ ] P14 Perform final architecture audit.
- [ ] P14 Update final `memory.md`.
- [ ] P14 Record changed files.
- [ ] P14 Record tests passed/not run.
- [ ] P14 Record known issues.
- [ ] P14 Close remaining TODOs.

---

# 21. Mandatory `memory.md` Update Protocol

The coding agent MUST update `memory.md` after every meaningful change.

Meaningful changes include:

- creating/modifying a backend function;
- request validation changes;
- compatibility rules;
- prompt changes;
- Gemini integration;
- OpenRouter fallback;
- output schema changes;
- frontend generation endpoint changes;
- n8n removal;
- tests;
- deployment/configuration changes;
- discovering a migration-relevant pre-existing issue;
- making an architectural decision.

Use this format:

```md
## YYYY-MM-DD — <Task Name>

### Instruction
What the agent was asked to do.

### Inspected
Relevant files/modules inspected.

### Changed
What was actually changed.

### Why
Reason for the change.

### Tests
What was tested and the result.

### Status
COMPLETE / PARTIAL / BLOCKED

### Notes
Important caveats and next steps.
```

Keep entries concise but concrete. Future agents must be able to understand the history without reopening every old conversation.

---

# 22. Required `memory.md` Final Summary

Before finishing, the agent must write this final section:

```md
# Final Migration Summary

## Objective
...

## Final Generation Route
...

## Authentication
...

## Primary Provider
Gemini

## Fallback Provider
OpenRouter

## Structured Output Validation
...

## Compatibility Validation
...

## Existing Business Logic Preserved
...

## n8n Removed
...

## Files Created
...

## Files Modified
...

## Files Deleted
...

## Tests Passed
...

## Tests Not Run
...

## Known Issues
...

## Remaining TODO
...

## Final Status
COMPLETE / PARTIAL / BLOCKED
```

Do not claim `COMPLETE` while required work remains unfinished.

---

# 23. How to Handle Differences in the Existing Codebase

The plan contains conceptual module names. The repository's real architecture takes precedence.

When an expected path/module does not exist:

1. inspect the repository;
2. identify the equivalent implementation;
3. adapt the plan to the existing structure;
4. make the smallest safe change;
5. document the architectural difference in `memory.md`.

Do not create duplicate providers/routes merely because this plan shows example directories such as:

```text
providers/gemini.ts
providers/openrouter.ts
```

Reuse an existing provider abstraction when one already exists.

---

# 24. What the Agent Must NOT Change

Unless a change is demonstrably required for the generation integration, do not rewrite:

- auth;
- database schema;
- billing;
- Razorpay;
- credit system;
- free quota system;
- referral system;
- social rewards;
- ad system;
- gamification;
- admin panel;
- support system;
- unrelated routes/components.

Do not add another AI provider unless the architecture is explicitly changed later.

Do not reintroduce AI conversation memory.

Do not call Gemini and OpenRouter in parallel for every request.

Do not silently change project-type/industry definitions without updating the centralized source and `memory.md`.

---

# 25. Definition of Complete Implementation

The final system must behave like this:

```text
Authenticated request
        |
        v
Request validation
        |
        v
Industry/project compatibility validation
        |
        v
Realistic project-brief prompt
        |
        v
Gemini PRIMARY
        |
        +---- valid JSON ----> strict schema validation ----> return brief
        |
        +---- retryable error -> OpenRouter FALLBACK
                                   |
                                   v
                              strict schema validation
                                   |
                              +---- valid ----> return brief
                              |
                              +---- invalid --> proper HTTP error
```

And simultaneously:

```text
n8n = removed from generation path
ClawCloud = not required
Simple Memory = not recreated
Credits = unchanged
Quota = unchanged
Payments = unchanged
Rewards = unchanged
Ads = unchanged
Existing application = regression-tested
memory.md = current
TODO = current/closed
```

---

# 26. Final Engineering Rule

> **Do not optimize for “looks implemented”. Optimize for “actually implemented, server-enforced, testable, observable, and safe to merge into the existing product”.**

The migration is successful only when the real backend generates validated client briefs without n8n while the rest of tRIAL-CLIENTS continues to behave as before.
