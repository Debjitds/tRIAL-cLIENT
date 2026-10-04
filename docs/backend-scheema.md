# backend-scheema.md

## 1. Purpose

This document is the complete implementation handoff for migrating the existing **tRIAL-CLIENTS AI Project Brief Generation backend** away from **n8n** and into the application's normal backend infrastructure.

The coding agent receiving this document must be able to implement the migration **without needing the exported n8n workflow JSON**.

The migration must preserve the current generation behavior and output quality while replacing the old orchestration with a clean server-side API.

### Target architecture

```text
Frontend
   |
   | authenticated request
   v
Existing App Backend / Supabase Edge Function
   |
   | validate + normalize
   v
Prompt Builder
   |
   v
Gemini (PRIMARY)
   |
   | valid structured output
   |------------------------------> return result
   |
   | retryable Gemini failure only
   v
OpenRouter (SECONDARY FALLBACK)
   |
   v
Structured output validation
   |
   v
Return Project Brief
```

### Non-negotiable migration goals

- Remove n8n from the generation path completely.
- Do not depend on ClawCloud Run or any n8n deployment.
- Gemini is the primary AI provider.
- OpenRouter is a secondary fallback provider.
- Do not recreate the old n8n AI Agent memory behavior.
- Do not add credit, payment, quota, referral, reward, or ad logic to this migration.
- Preserve the existing frontend request/response contract as much as practical.
- Preserve the project-brief quality and realistic client-simulation behavior.
- Use server-side secrets only.
- Return real HTTP error codes rather than HTTP 200 with an error object.
- Avoid exposing raw prompts, provider credentials, or internal debug payloads to the browser.

---

# 2. Scope

## In scope

1. Generation endpoint.
2. Request validation and normalization.
3. Prompt construction.
4. Gemini primary provider integration.
5. OpenRouter secondary fallback integration.
6. Structured JSON parsing/validation.
7. Provider timeout/error handling.
8. Correct HTTP status handling.
9. Secure server-side logging.
10. Minimal frontend integration changes needed to point generation requests to the new backend.
11. Removal of n8n generation dependencies.
12. Backward-compatible input aliases needed by the existing frontend.

## Explicitly out of scope

Do NOT modify or reimplement these systems as part of this migration:

- Free monthly quota logic.
- Purchased-credit deduction.
- Credit refund rules.
- Pro plan logic.
- Razorpay/payment logic.
- Credit-pack purchasing.
- Referral credits.
- Social-post rewards.
- Ad/reward-ad logic.
- Gamification/XP/badges.
- Existing billing/history behavior.
- Existing admin billing tools.

Those systems already work and must remain owned by their existing backend/application logic.

The generation service should simply generate the requested brief. Existing authorization/credit/quota logic must remain at its current architectural boundary.

---

# 3. Source Workflow Being Replaced

The original n8n workflow was:

```text
Webhook: generate-brief
    ->
Build Prompt
    ->
AI Agent
    ->
Parse Gemini Output
    ->
Respond to Webhook
```

The workflow also contained:

```text
Google Gemini Chat Model -> AI Agent
Simple Memory -> AI Agent
OpenRouter Chat Model -> not actually connected
```

Important migration interpretation:

- Gemini was the actual connected model provider in the exported workflow.
- The OpenRouter model existed in the export but was NOT connected to the AI Agent.
- Therefore OpenRouter fallback is a new agreed architecture, not a behavior that should be copied from n8n.
- Simple Memory was connected to the AI Agent, but the generation use case is a one-shot project-brief generation flow. Do not recreate that memory layer.

The exported workflow also contained some old implementation behavior that should NOT be copied directly:

- permissive fallback defaults for missing inputs;
- raw debug payload returned from the prompt-building stage;
- regex-based JSON extraction;
- HTTP 200 responses even when parsing failed;
- n8n-specific Agent/Memory orchestration.

---

# 4. Existing Generation Endpoint

## Legacy endpoint concept

The old n8n webhook path was:

```text
/generate-brief
```

The new backend should expose the same logical route where practical:

```text
POST /generate-brief
```

If the application's backend has a versioned API convention, a versioned route is acceptable, for example:

```text
POST /api/v1/generate-brief
```

However, avoid forcing unnecessary frontend rewrites. Reuse the application's established backend routing style.

---

# 5. Authentication

The generation endpoint must be authenticated.

The backend must verify the existing application's authentication/session mechanism before allowing generation.

Do not trust:

- `user_id` supplied only in the request body;
- client-side plan status;
- client-side credit balance;
- client-side quota counters.

The authenticated user identity must come from the verified backend auth context/session/token.

The migration must not introduce a second independent authentication system.

### Important boundary

Authentication/authorization may be verified here, but this migration must not redesign the existing quota/credit rules.

The existing application's generation permission layer remains authoritative for:

- whether the user is allowed to generate;
- whether a free generation is available;
- whether purchased credits may be consumed;
- how credits are deducted/refunded.

---

# 6. Request Contract

The frontend generation request represents three required selection values:

```json
{
  "level": "beginner",
  "industry": "Restaurant / Café",
  "project_type": "Landing Page"
}
```

The backend must support the following compatibility aliases because the old n8n Function node accepted them.

### Level

Accept:

```text
level
Level
```

### Project type

Accept:

```text
project_type
projectType
projecttype
```

### Industry

Accept:

```text
industry
Industry
```

The backend may also inspect the request body/query/params only where the existing framework requires it, but the preferred new contract is a normal authenticated JSON POST body.

Do not preserve unnecessary n8n-style payload searching unless it is genuinely needed for backward compatibility.

---

# 7. Canonical Internal Request Schema

Normalize incoming values into:

```ts
type GenerateBriefRequest = {
  level: "beginner" | "intermediate" | "veteran";
  industry: string;
  projectType: string;
};
```

Normalization should:

1. Locate the supported field aliases.
2. Convert `level` to lowercase.
3. Trim whitespace.
4. Strip HTML tags from string input.
5. Limit string input length to a safe maximum.
6. Normalize equivalent casing/spacing where appropriate.
7. Preserve the selected semantic value instead of inventing a replacement.

### Recommended maximum input length

For selection fields, a limit around **120 characters per field** is sufficient and preserves the behavior of the previous n8n Function node.

Do not silently transform arbitrary long user content into generation instructions.

---

# 8. Validation Rules

The new backend should be stricter than the old n8n implementation.

### Required fields

All three must resolve successfully:

- `level`
- `industry`
- `projectType`

### Invalid request

Missing or invalid values should return:

```http
400 Bad Request
```

with a structured error such as:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Valid level, industry, and project type are required."
  }
}
```

Do NOT silently use old fallback defaults such as:

```text
level = beginner
project_type = website
industry = general
```

Those defaults were legacy behavior from the n8n Function node and are not appropriate for a production generation endpoint because they can produce the wrong project for the user's selection.

---

# 9. Allowed Levels

The application supports:

```text
beginner
intermediate
veteran
```

Case-insensitive input is acceptable after normalization.

Any other level should be rejected with HTTP 400.

---

# 10. Project Context and Compatibility

The product intentionally treats:

> **Industry = business context**
>
> **Project Type = technical solution**

The backend must not assume that every project type is valid for every industry.

The UI should ideally already filter project-type options based on industry/level. The backend must still validate the final request so that a crafted request cannot create nonsensical combinations.

### Beginner industries

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

### Beginner project types

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

These are intentionally simple and broadly compatible with beginner-level business contexts.

### Intermediate industries

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

### Intermediate project types

Broadly reusable where logically applicable:

```text
Dashboard / Analytics Panel
Booking or Appointment System
Blogging Platform with CMS
Membership Website
Chat / Messaging Web App
Course Platform (Mini LMS)
```

Context-specific project types:

```text
E-commerce Website / Shop System
Real Estate Listing Website
Food Delivery Web App
Job Portal / Recruitment System
Travel Booking System
```

The compatibility layer should reject combinations that are clearly incompatible.

Examples:

- `Real Estate Listing Website` + `Real Estate` -> valid.
- `Food Delivery Web App` + `Food Delivery & Services` -> valid.
- `Travel Booking System` + `Travel & Hospitality` -> valid.
- `Real Estate Listing Website` + `SaaS / Productivity Tools` -> invalid unless the product specifically defines a real-estate SaaS context.
- `E-commerce Website / Shop System` + `SaaS / Productivity Tools` -> invalid as a generic shop, unless the application explicitly represents a SaaS subscription/add-on commerce scenario.

### Veteran industries

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

### Veteran project types

Universal enterprise-style choices:

```text
Enterprise Admin Dashboard
Data Visualization & Analytics Platform
Automation Workflow Builder
Subscription / Credit-Based Platform
API-first Platform / Integration Hub
AI Chatbot / Virtual Assistant System
Project Management / Collaboration Tool
```

Industry-specific choices:

```text
AI SaaS Platform
FinTech Dashboard / Portfolio Tracker
Full LMS (Enterprise)
Marketplace Platform (Multi-vendor)
Social Media Platform
Cybersecurity Monitoring System
```

The implementation should make the compatibility matrix easy to extend later.

Do not hard-code compatibility logic in multiple frontend and backend locations. Prefer one clear source of truth or a centralized compatibility module.

---

# 11. Project Brief Quality & Real-World Simulation

This section is important.

The generation backend is not simply generating a random "website idea". The purpose is to simulate the experience of receiving a realistic client project.

The final model prompt must preserve this quality philosophy from the existing project prompt.

## Required generation behavior

The AI must act as an:

> expert AI project brief generator and creative project manager

The generated result should feel like:

- a genuine business request;
- a realistic client brief;
- a project proposal prepared by a professional project manager/agency;
- something a developer/designer could realistically receive and build.

### Company realism

Every generated brief should contain a:

- fictional but believable company name;
- relevant tagline;
- relevant location;
- company identity appropriate to the selected industry.

The company should feel specific rather than generic.

Avoid combinations where the company has no logical relationship to the chosen industry.

### Internal consistency

All generated sections must belong to the same fictional company and business case.

The following must remain logically connected:

```text
company_name
tagline
slogan
location
intro
objective
requirement_design
about_page
home_page
order_page
audience
tips
```

Do not generate sections independently.

For example:

- company positioning should match the industry;
- target audience should match the business;
- homepage content should reflect the stated objective;
- conversion/order/booking flow should match the project's actual business model;
- design direction should support the brand identity.

### Natural tone

The writing should be:

- professional;
- human-like;
- specific;
- slightly creative;
- practical;
- client-facing.

Avoid repetitive AI-sounding phrases and generic filler.

Do not repeatedly say:

```text
"Build a modern website..."
"Create a user-friendly website..."
"Make it responsive and attractive..."
```

unless a specific section genuinely requires such language.

### No generic project framing

Do not frame every project as a generic "website development task".

Examples should feel different based on context:

- a restaurant may focus on menu discovery, reservations, location, and conversion;
- a SaaS product may focus on onboarding, dashboard workflows, and subscription conversion;
- a real-estate product may focus on search, filtering, property details, and lead capture;
- a media product may focus on content discovery, categories, publishing, and engagement;
- a FinTech product may focus on portfolio visibility, insights, data clarity, and secure user actions.

### Branding

The generated company should also produce coherent visual direction:

```text
primary_color_palette     (array of color strings, e.g. ["#2E8B57", "#F5F5F5", "#222222"])
design_style_keywords     (array of keyword strings, e.g. ["minimalist", "modern", "eco-friendly"])
```

These should be appropriate to the industry and company identity.

Both fields are ARRAY OF STRINGS, not a single comma-joined sentence. The
frontend renders each palette entry as a colour swatch and each design keyword
as a chip, so the array shape is part of the application data contract.

Do not produce random color/style combinations disconnected from the fictional business.

---

# 12. Output Schema

The model must return exactly these top-level fields:

```json
{
  "company_name": "",
  "tagline": "",
  "slogan": "",
  "location": "",
  "primary_color_palette": ["#2E8B57", "#F5F5F5", "#222222"],
  "design_style_keywords": ["minimalist", "modern", "eco-friendly"],
  "intro": "",
  "objective": "",
  "requirement_design": "",
  "about_page": "",
  "home_page": "",
  "order_page": "",
  "audience": "",
  "tips": ""
}
```

No additional top-level fields should be required by the frontend.

Twelve fields are single strings. Two fields — `primary_color_palette` and
`design_style_keywords` — are ARRAY OF STRINGS (established application
contract; the frontend maps over them to render swatches/chips).

### Legacy field note: `order_page`

`order_page` is an existing output field and should remain for compatibility.

It does NOT mean that every project literally needs a page named "Order Page".

Interpret it according to the business context:

- e-commerce -> order/checkout flow;
- restaurant -> ordering/reservation/conversion flow;
- travel -> booking flow;
- SaaS -> subscription/upgrade/onboarding conversion flow;
- marketplace -> transaction/request flow;
- portfolio/service business -> inquiry/contact/conversion flow;
- content/media -> relevant primary engagement/conversion flow.

Keep the field name unchanged for compatibility while making the content semantically appropriate.

---

# 13. Prompt Construction

The backend should use a dedicated prompt-builder/service rather than constructing large prompt strings inside the HTTP route.

Suggested responsibility:

```text
generateBriefHandler
    ->
validateRequest
    ->
normalizeRequest
    ->
validateCompatibility
    ->
buildProjectBriefPrompt
    ->
generateWithGemini
    ->
validateGeneratedBrief
```

The prompt should explicitly include the normalized context:

```text
Developer Level: ...
Project Type: ...
Industry: ...
```

Then include the real-world-simulation requirements from Section 11.

### Prompt requirements

The system/model instructions should explicitly state:

1. Generate a realistic human-like client project brief.
2. Use a fictional but believable company.
3. Ensure the company naturally belongs to the selected industry.
4. Keep every section connected to the same business.
5. Match the technical scope to the selected level.
6. Match the project flow to the selected project type.
7. Use professional project-manager/client-proposal language.
8. Avoid generic AI filler.
9. Return strict JSON only.
10. Return exactly the required field set.

---

# 14. Do NOT Recreate n8n Simple Memory

The old workflow connected a Simple Memory node to the AI Agent.

Do NOT recreate it.

Reason:

- This is a one-shot generation request.
- Each brief should be generated independently.
- There is no conversational multi-turn context requirement.
- Artificially persisting the full prompt as memory adds unnecessary state and complexity.
- The old memory session key was effectively the full prompt, which is not useful application memory.

The new implementation should perform one deterministic model request using the constructed prompt.

---

# 15. Provider Architecture

The backend must use a provider abstraction.

Example conceptual interface:

```ts
type BriefGenerationProvider = {
  generateBrief(input: {
    prompt: string;
  }): Promise<ProviderResult>;
};
```

Recommended modules:

```text
providers/
  gemini.ts
  openrouter.ts
  types.ts
```

The application should not couple the route handler directly to one provider's SDK shape.

---

# 16. Gemini = PRIMARY Provider

Gemini must always be attempted first when enabled.

Environment/configuration should be server-side.

Recommended variables:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

The model name must be configurable rather than permanently hard-coded into business logic.

Use the current official Gemini server-side API/SDK integration supported by the selected runtime.

The API key must never be exposed to:

- browser JavaScript;
- client bundle;
- response payload;
- database rows;
- debug UI.

---

# 17. OpenRouter = SECONDARY FALLBACK

OpenRouter is fallback only.

Do NOT call both Gemini and OpenRouter for every request.

Correct sequence:

```text
Gemini
  |
  +-- success + valid JSON --> return
  |
  +-- retryable failure --> OpenRouter
  |
  +-- non-retryable failure --> return error
```

Recommended configuration:

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
```

The OpenRouter model should be configurable.

Do not depend on the old n8n OpenRouter model name merely because it appeared in the exported workflow. That node was not connected and the new fallback should be treated as a configurable provider choice.

---

# 18. Gemini Failure Classification

Fallback should happen only for failures where retrying through another provider makes sense.

### Fallback-eligible examples

Typical retryable categories include:

- provider timeout;
- temporary network failure;
- temporary upstream/server failure;
- service unavailable;
- rate limiting where fallback is appropriate.

### Do NOT fallback blindly

Do not switch to OpenRouter for errors such as:

- invalid application request;
- invalid prompt construction;
- invalid local schema;
- authentication/configuration failure caused by a missing/invalid Gemini secret, if the problem indicates broken deployment configuration rather than a temporary provider outage;
- internal coding bugs.

However, deployment configuration may optionally support a startup health check that marks a provider unavailable and allows the service to use the secondary provider. The exact behavior should remain explicit and observable rather than silently swallowing configuration errors.

---

# 19. Provider Execution Rule

Only one provider should normally be active at a time.

### Normal request

```text
Request
  ->
Gemini
  ->
validate
  ->
success
```

### Gemini retryable failure

```text
Request
  ->
Gemini
  ->
retryable failure
  ->
OpenRouter
  ->
validate
  ->
success
```

### Both providers fail

Return an appropriate server/provider error.

Do not return HTTP 200 with:

```json
{
  "error": "..."
}
```

---

# 20. Structured Output

The existing n8n implementation tried to recover JSON using:

- fenced-code removal;
- regex extraction of the first `{...}`;
- `JSON.parse`.

This was fragile.

The new backend must prefer structured output from the provider whenever the selected model/API supports reliable JSON/schema-constrained responses.

The model should be explicitly instructed to output only JSON.

### Validation sequence

```text
Provider response
    ->
extract model text
    ->
parse JSON
    ->
validate required schema
    ->
validate field types
    ->
validate non-empty required fields
    ->
return result
```

A small defensive cleanup of accidental markdown fences may be retained as a last-resort compatibility measure, but it must not replace schema validation.

---

# 21. Output Validation Rules

The backend must validate that all required fields exist:

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

Twelve fields must be non-empty strings. Two fields must be arrays of non-empty
strings:

- `primary_color_palette`: array of color strings
- `design_style_keywords`: array of keyword strings

Reject output when:

- required fields are missing;
- a single-string field is not a string;
- `primary_color_palette` / `design_style_keywords` are not arrays of strings
  (a comma-joined string must be rejected at generation time, not coerced);
- JSON cannot be parsed;
- the response is empty;
- the model returns obvious non-JSON commentary instead of the brief.

Do not return partially parsed garbage to the frontend.

### Provider output failure

If Gemini returns malformed output:

- treat it as a provider-generation/validation failure;
- decide whether a single fallback attempt through OpenRouter is appropriate;
- do not endlessly retry.

---

# 22. API Success Response

On success, the endpoint should return the project brief JSON directly or inside the application's established response envelope.

Preferred simple contract:

```http
200 OK
Content-Type: application/json
```

```json
{
  "company_name": "...",
  "tagline": "...",
  "slogan": "...",
  "location": "...",
  "primary_color_palette": ["...", "..."],
  "design_style_keywords": ["...", "..."],
  "intro": "...",
  "objective": "...",
  "requirement_design": "...",
  "about_page": "...",
  "home_page": "...",
  "order_page": "...",
  "audience": "...",
  "tips": "..."
}
```

Do not include internal provider details unless the existing frontend explicitly needs them.

---

# 23. Error Contract

Use a consistent error envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Suggested mappings:

| Situation | HTTP |
|---|---:|
| Invalid/missing input | 400 |
| Not authenticated | 401 |
| Authenticated but not permitted by existing access layer | 403 |
| Rate limited by application/provider | 429 |
| Provider temporarily unavailable | 503 |
| Unexpected backend error | 500 |

The implementation must not convert provider or parsing failures into a fake HTTP 200 success.

---

# 24. Timeouts

AI requests must have an explicit timeout.

Do not allow a provider request to hang indefinitely.

Use a server-appropriate timeout with enough room for a normal brief-generation request.

A timeout should be classified as retryable for provider fallback where appropriate.

Do not create long synchronous chains.

---

# 25. Retry Policy

Keep retries conservative.

Recommended behavior:

```text
Gemini:
  one normal attempt

If Gemini has a retryable failure:
  one OpenRouter fallback attempt

Stop
```

Do not implement:

```text
Gemini retry x3
OpenRouter retry x3
Gemini again
OpenRouter again
```

This increases latency, complexity, and provider cost.

The goal is resilience, not uncontrolled retry storms.

---

# 26. Idempotency

The generation operation creates an AI result, so accidental duplicate browser/network retries can potentially create duplicate generations.

The backend may support an idempotency key such as:

```http
Idempotency-Key: <client-generated-request-id>
```

If implemented, the idempotency result must be stored server-side and associated with the generation request.

Important:

- Do not use idempotency as a reason to redesign the existing credit system.
- Do not add separate billing semantics.
- The existing credit/quota layer remains responsible for charging/finalizing usage.

Idempotency is optional for the first migration unless the current application already has a request-id pattern.

---

# 27. Logging

Log enough information for debugging without leaking secrets.

Useful server-side fields:

```text
request_id
authenticated_user_id (or safe internal identifier)
level
industry
project_type
provider_selected
provider_fallback_used
duration_ms
success/failure
error_code
```

Do NOT log:

- API keys;
- authorization headers;
- complete raw user tokens;
- unnecessary sensitive user data;
- full prompt text unless there is an explicit secure debugging requirement.

---

# 28. Debug Data

The old n8n Build Prompt returned a `debug_source` containing the raw incoming payload and normalized values.

Do NOT return this to the frontend in production.

Do not expose:

```text
raw incoming payload
full prompt
provider response internals
stack trace
credentials
n8n metadata
```

A request ID may be returned for support/debugging:

```json
{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Project brief generation is temporarily unavailable.",
    "request_id": "..."
  }
}
```

Only include a `request_id` if the existing API pattern supports it.

---

# 29. Database Requirements

This migration should not require a new database architecture.

Do not introduce new tables unless there is an already-approved application requirement.

Existing project/history persistence should remain owned by the application's current generation flow.

The AI provider service itself should not independently create duplicate project records.

### Separation principle

```text
Generation Service
    = produce validated brief

Existing Application Generation/Usage Layer
    = decide access
    = consume quota/credits
    = persist project/history
    = handle existing business rules
```

---

# 30. Credit-System Boundary

This section is mandatory.

The new AI generation endpoint must NOT implement:

- free quota decrement;
- paid credit decrement;
- credit refund;
- monthly quota reset;
- Pro entitlement;
- credit-pack handling;
- reward-credit handling.

The existing working credit system must remain unchanged.

The developer must not "simplify" the migration by moving credit accounting into the new Edge Function.

That would create two competing sources of truth and could cause:

- double deductions;
- missing deductions;
- incorrect refunds;
- quota drift;
- payment/accounting inconsistencies.

Preserve the current architecture instead.

---

# 31. Failure Semantics

The generation pipeline should be treated as a transaction-like operation from the perspective of the caller:

```text
No valid brief
    -> no successful generation result
```

Do not label a failed model response as a generated project.

The existing generation/history UI already distinguishes successful generated briefs from failed attempts. The backend must preserve that distinction.

A malformed provider response must never be returned as a valid project.

---

# 32. Frontend Compatibility

Frontend changes should be minimal.

Replace the old n8n webhook URL with the new backend endpoint.

Keep the existing selection values:

```text
level
industry
project_type
```

When possible, preserve the current response field names exactly.

The frontend should continue to render:

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

`primary_color_palette` and `design_style_keywords` are rendered as lists and
must be arrays of strings. The frontend must normalize these two fields
(defensively, e.g. via a shared helper) so that legacy rows which stored them
as a single comma-joined string still render without crashing.

### Frontend error handling

The frontend should handle backend HTTP statuses rather than assuming every request is 200.

At minimum distinguish:

```text
400 -> invalid request
401 -> authentication required
403 -> not permitted
429 -> temporarily rate limited
503 -> generation service unavailable
500 -> unexpected server error
```

Do not make the frontend inspect arbitrary internal provider error text to decide application behavior.

---

# 33. n8n Removal

Once the new backend is confirmed working:

Remove the generation dependency on:

- n8n webhook URL;
- ClawCloud Run generation workflow;
- n8n-specific response parsing;
- n8n AI Agent;
- n8n Simple Memory;
- n8n credential references;
- dead OpenRouter n8n node.

Do not remove or modify unrelated application features.

Search the codebase for:

```text
n8n
generate-brief
old webhook URL
clawcloud
```

and remove only the obsolete generation-path references.

---

# 34. Secret Management

Use server-side environment/secrets.

Required conceptual secrets:

```env
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
```

Model configuration:

```env
GEMINI_MODEL=...
OPENROUTER_MODEL=...
```

Optional provider controls:

```env
GEMINI_ENABLED=true
OPENROUTER_FALLBACK_ENABLED=true
```

Do not expose any secret through:

- Vite public environment variables;
- client-side environment variables;
- React source;
- browser network payloads;
- generated project JSON.

Never hard-code API keys in source.

---

# 35. Security Requirements

The implementation must:

1. Validate authentication server-side.
2. Validate request shape server-side.
3. Validate allowed level/industry/project type server-side.
4. Validate compatibility server-side.
5. Keep provider secrets server-side.
6. Avoid prompt/debug leakage.
7. Avoid accepting arbitrary prompt text as a replacement for the structured selection fields unless explicitly required later.
8. Protect the endpoint from obvious abuse using the application's existing auth/rate-limit layer.
9. Avoid trusting client-supplied role/plan/admin flags.
10. Return safe public errors without stack traces.

The model must receive controlled application-generated prompt content, not an unfiltered hidden request envelope.

---

# 36. Suggested Backend Service Structure

Use the project's existing backend conventions. Conceptually:

```text
backend/
  generate-brief/
    handler / route
    validation
    prompt-builder
    providers/
      gemini
      openrouter
    schema
    errors
```

A simpler single Edge Function is also acceptable if that matches the current project.

The important architectural separation is:

```text
HTTP layer
   ->
Validation
   ->
Compatibility
   ->
Prompt Builder
   ->
Provider abstraction
   ->
Structured Output Validation
   ->
Response
```

Do not over-engineer this into an unnecessary multi-service system.

---

# 37. Provider Selection Algorithm

Use this exact high-level logic:

```text
1. Authenticate request.
2. Validate request.
3. Normalize request.
4. Validate context compatibility.
5. Build the project-brief prompt.
6. Call Gemini.
7. Parse + validate Gemini response.
8. If valid -> return success.
9. If Gemini failure is retryable -> call OpenRouter once.
10. Parse + validate OpenRouter response.
11. If valid -> return success.
12. Otherwise return an appropriate error.
```

Pseudo-code:

```ts
async function generateBrief(request) {
  const auth = await requireAuthenticatedUser(request);

  const input = normalizeAndValidate(request);
  validateCompatibility(input);

  const prompt = buildProjectBriefPrompt(input);

  const geminiResult = await gemini.generate({ prompt });

  if (geminiResult.ok) {
    const brief = validateProjectBrief(geminiResult.text);

    if (brief.ok) {
      return brief.value;
    }
  }

  if (isRetryable(geminiResult)) {
    const fallbackResult = await openRouter.generate({ prompt });

    if (fallbackResult.ok) {
      const brief = validateProjectBrief(fallbackResult.text);

      if (brief.ok) {
        return brief.value;
      }
    }
  }

  throw mapToHttpError(...);
}
```

This is the target behavior, not mandatory literal code.

---

# 38. Prompt Integrity

The prompt-builder must be deterministic with respect to the three selected context values.

For the same:

```text
level + industry + project type
```

the system should construct the same instruction structure, while the model may still produce a different fictional company/brief.

Do not allow:

- request field order;
- browser-specific formatting;
- debug metadata;
- hidden n8n fields;

to accidentally alter the semantic prompt.

---

# 39. Level-Aware Scope

The generated project's complexity should match the selected developer level.

### Beginner

Prefer:

- smaller scope;
- clear page structure;
- basic forms;
- straightforward user flows;
- minimal system complexity.

Avoid unnecessarily advanced architecture.

### Intermediate

Prefer:

- multiple user flows;
- dashboards;
- CMS or dynamic content;
- booking/membership/chat;
- moderate data interactions;
- realistic application logic.

### Veteran

Prefer:

- complex workflows;
- enterprise dashboards;
- analytics;
- integrations;
- multi-role systems;
- advanced business logic;
- scalable platform thinking.

Do not make every Veteran brief identical in architecture. Complexity should fit the chosen industry and project type.

---

# 40. Exact Output Field Requirements

Each generated brief must contain:

### `company_name`

A fictional but believable organization/product name.

### `tagline`

A concise brand/value statement.

### `slogan`

A short memorable marketing line.

### `location`

A plausible location relevant to the fictional business.

### `primary_color_palette`

An ARRAY of color strings (hex preferred) forming a coherent palette appropriate for the brand, e.g. `["#2E8B57", "#F5F5F5", "#222222"]`.

### `design_style_keywords`

An ARRAY of keyword strings describing useful visual/design directions rather than generic adjectives, e.g. `["minimalist", "soft-rounded", "eco-friendly"]`.

### `intro`

A client-facing description of the company/project context.

### `objective`

What the client wants to achieve and why the project matters.

### `requirement_design`

Detailed functional + design requirements, appropriate to level and project type.

### `about_page`

What the company/about experience should communicate.

### `home_page`

The homepage content/structure and key user priorities.

### `order_page`

The project's primary transaction/conversion/booking/request flow, adapted to the business model.

### `audience`

Specific target users/customers.

### `tips`

Practical implementation guidance, considerations, or client expectations.

---

# 41. Migration Testing

Before declaring the migration complete, test at least:

## Input tests

```text
beginner + valid industry + valid project type
intermediate + valid industry + valid project type
veteran + valid industry + valid project type
```

Alias tests:

```text
level
Level

project_type
projectType
projecttype

industry
Industry
```

Invalid tests:

```text
missing level
missing industry
missing project type
invalid level
unknown industry
unknown project type
invalid industry/project-type combination
overlong values
HTML-tagged input
unauthenticated request
```

## AI tests

Verify:

```text
Gemini success
Gemini timeout
Gemini temporary provider failure
Gemini malformed JSON
Gemini valid JSON but missing fields
OpenRouter fallback success
OpenRouter failure
both providers unavailable
```

## Output tests

Verify:

- exact required field names;
- all required fields present;
- all required fields are strings;
- no markdown wrapper required by frontend;
- no internal debug fields;
- no provider credentials;
- no malformed/partial brief.

## Regression tests

Verify that the migration does NOT break:

- project generation UI;
- project workspace/output page;
- recent projects/history;
- authentication;
- existing credit/quota behavior;
- Pro/payment behavior;
- existing admin functionality.

---

# 42. Backward Compatibility Checklist

Before release:

- [ ] Old frontend request field aliases remain accepted where needed.
- [ ] New endpoint returns the expected output fields.
- [ ] Existing project rendering still works.
- [ ] Existing history behavior still works.
- [ ] n8n URL is no longer called.
- [ ] No ClawCloud Run dependency remains.
- [ ] Gemini is primary.
- [ ] OpenRouter is fallback only.
- [ ] No n8n memory is recreated.
- [ ] No credit logic moved into this service.
- [ ] No payment logic moved into this service.
- [ ] No quota reset logic moved into this service.
- [ ] No reward/ad logic moved into this service.
- [ ] API keys are server-side only.
- [ ] Errors use correct HTTP status codes.
- [ ] Failed generations are not returned as successful project data.
- [ ] Raw debug payload is not exposed.
- [ ] Production logs do not contain secrets.

---

# 43. Non-Negotiable Guardrails

The coding agent MUST follow these rules:

### Do not

- reintroduce n8n;
- create an n8n-compatible fake layer;
- recreate Simple Memory;
- call Gemini and OpenRouter in parallel for every request;
- expose API keys;
- trust client-side quota/credit/plan values;
- silently default missing generation context;
- return HTTP 200 for provider/parser failures;
- return malformed model output;
- expose full prompts/debug payloads;
- change the existing credit/payment/quota architecture;
- add unrelated ad/reward/referral functionality;
- rewrite the whole application when only the generation backend needs migration.

### Do

- use the existing backend;
- keep the implementation small and maintainable;
- use Gemini as primary;
- use OpenRouter only as fallback;
- validate input and compatibility;
- validate model output;
- preserve the existing output schema;
- preserve the realistic-client-brief generation philosophy;
- keep secrets server-side;
- make frontend changes minimal.

---

# 44. Recommended Failure Messages

Public-facing messages should be useful but not leak internals.

### Invalid request

```text
Please select a valid level, industry, and project type.
```

### Temporary provider issue

```text
Project brief generation is temporarily unavailable. Please try again.
```

### Rate limit

```text
Too many generation requests were received. Please try again shortly.
```

### Unexpected error

```text
Something went wrong while generating the project brief.
```

Internal logs may contain the actual provider error classification.

---

# 45. Final Architecture

The finished system should conceptually be:

```text
                      ┌─────────────────────┐
                      │   tRIAL-CLIENTS UI   │
                      │  Level / Industry /  │
                      │    Project Type      │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │ Authenticated API   │
                      │  POST /generate-    │
                      │        brief        │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │ Validate + Normalize│
                      │ + Compatibility     │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │   Prompt Builder    │
                      │ Realistic Client    │
                      │ Brief Instructions  │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  Gemini PRIMARY     │
                      └──────────┬──────────┘
                                 │
                         valid structured JSON?
                          ┌──────┴──────┐
                         YES           NO
                          │             │
                          ▼             ▼
                    Return Brief    retryable?
                                       │
                                  ┌────┴────┐
                                 NO         YES
                                  │           │
                                  ▼           ▼
                              HTTP Error   OpenRouter
                                             SECONDARY
                                                │
                                         validate JSON
                                                │
                                          ┌─────┴─────┐
                                         YES          NO
                                          │             │
                                          ▼             ▼
                                      Return Brief   HTTP Error
```

### Responsibility boundary

```text
Existing Application
    ├── Auth
    ├── User permissions
    ├── Free quota
    ├── Paid credits
    ├── Payments / Razorpay
    ├── Pro plan
    ├── Referral system
    ├── Rewards / social posting
    ├── Ads
    ├── History persistence
    └── Admin/business rules

New Generation Backend
    ├── Authenticate request
    ├── Validate generation context
    ├── Build realistic project prompt
    ├── Gemini primary generation
    ├── OpenRouter fallback
    ├── Structured JSON validation
    └── Return valid project brief
```

---

# 46. Implementation Priority

Implement in this order:

1. New authenticated `/generate-brief` backend route/function.
2. Request normalization and validation.
3. Industry/project compatibility validation.
4. Prompt builder using the real-world project-brief quality rules.
5. Gemini provider.
6. Structured output validation.
7. OpenRouter fallback.
8. Correct HTTP error mapping.
9. Minimal frontend endpoint replacement.
10. Remove old n8n generation references.
11. Run regression tests.
12. Verify existing credit/payment/quota systems remain untouched.

Do not start by refactoring unrelated application modules.

---

# 47. Definition of Done

The migration is complete only when:

- the frontend no longer sends generation requests to n8n;
- the application backend handles `/generate-brief`;
- Gemini is the primary provider;
- OpenRouter is used only as configured fallback;
- one-shot generation works without n8n memory;
- valid project briefs match the exact output schema;
- realistic client/business simulation quality is preserved;
- invalid requests are rejected server-side;
- incompatible industry/project combinations are rejected server-side;
- provider failures produce correct HTTP errors;
- secrets remain server-side;
- no raw debug payload is exposed;
- failed generations are not treated as successful projects;
- existing credit/payment/quota/referral/reward systems are unchanged;
- no unrelated features are removed or rewritten;
- n8n/ClawCloud Run is no longer required for generation.
