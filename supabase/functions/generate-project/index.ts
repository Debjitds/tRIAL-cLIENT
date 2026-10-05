// ============================================================================
// generate-project (Supabase Edge Function)
// ----------------------------------------------------------------------------
// Replaces the legacy n8n / ClawCloud webhook path with a direct Gemini
// PRIMARY + OpenRouter SECONDARY fallback generation flow.
//
// This file preserves ALL existing application business logic:
//   - JWT authentication (verify_jwt = true)
//   - Maintenance mode check
//   - User status / generation_enabled check
//   - Input validation
//   - Quota availability check (via check_quota_availability RPC)
//   - Project row creation with status = 'generating'
//   - (NEW) Gemini primary, OpenRouter fallback, structured output validation
//   - Update project row with brief_data + status = 'completed' (or 'failed')
//   - Consume quota/credits after success (via consume_quota_after_success RPC)
//   - XP awarding + badge check (unchanged)
//   - Response contract unchanged ({ ok, status, id, message, credits_used })
//
// What changed: only the middle block (previously: fetch n8n webhook + parse
// response) is replaced. The n8n dependency is fully removed.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// 1. Runtime configuration (all secrets are Edge Function env vars)
// ============================================================================
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") || "google/gemma-4-31b-it:free";
const GEMINI_TIMEOUT_MS = Number(Deno.env.get("GEMINI_TIMEOUT_MS") ?? "60000");
const OPENROUTER_TIMEOUT_MS = Number(Deno.env.get("OPENROUTER_TIMEOUT_MS") ?? "60000");
const MAX_FIELD_LENGTH = 120;

// ============================================================================
// 2. CORS (kept inline to match the existing function's style)
// ============================================================================
const allowedOrigins = [
  "https://avsuyudchzyoyakxotfm.lovable.app",
  "https://trial-clients.vercel.app",
  "https://trial-client-git-testing-debjitds-projects.vercel.app",
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovable\.dev$/,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://localhost:8081",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed = allowedOrigins.some((allowed) => {
    if (typeof allowed === "string") return origin === allowed;
    return allowed.test(origin);
  });
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// ============================================================================
// 3. Error envelope + safe response helpers
// ----------------------------------------------------------------------------
// The migration requires proper HTTP status codes, but the existing frontend
// (ProjectDetailModal.tsx) still checks `data.ok` and `data.status`, so we
// preserve both fields alongside the new `error.{code,message}` envelope.
// ============================================================================
class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "HttpError";
  }
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      status,
      error: { code, message },
      // Legacy fields kept so existing UI branches still work unchanged.
      message,
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function safeErrorFromException(err: unknown, corsHeaders: Record<string, string>): Response {
  if (err instanceof HttpError) {
    return errorResponse(err.status, err.code, err.publicMessage, corsHeaders);
  }
  console.error("Unexpected unhandled error:", (err as Error)?.message ?? err);
  return errorResponse(500, "UNEXPECTED", "Something went wrong while generating the project brief.", corsHeaders);
}

// ============================================================================
// 4. Catalog — Levels / Industries / Project Types (single source of truth)
// ----------------------------------------------------------------------------
// The application's frontend (src/components/QuotaLevelCard.tsx) defines the
// same catalog with slug → display-name pairs. This module mirrors those
// definitions and normalizes both input forms (slug or display name).
// ============================================================================
type Level = "beginner" | "intermediate" | "veteran";

const LEVELS: readonly Level[] = ["beginner", "intermediate", "veteran"] as const;

// slug -> canonical display name (used inside the model prompt)
const INDUSTRY_SLUG_TO_DISPLAY: Record<string, string> = {
  // beginner
  "personal-branding": "Personal Branding",
  "local-business": "Local Business",
  "blogging-content": "Blogging & Content",
  "portfolio-creative": "Portfolio & Creative Arts",
  "education-tutors": "Education (Students / Tutors)",
  "restaurant-cafe": "Restaurant / Café",
  "fitness-wellness": "Fitness & Wellness",
  photography: "Photography",
  "travel-diaries": "Travel Diaries",
  "event-celebrations": "Event & Celebrations",
  // intermediate
  "ecommerce-retail": "E-commerce & Retail",
  "healthcare-fitness": "Healthcare / Fitness",
  "real-estate": "Real Estate",
  "travel-hospitality": "Travel & Hospitality",
  "saas-productivity": "SaaS / Productivity Tools",
  "food-delivery": "Food Delivery & Services",
  "media-news": "Media & News",
  "media-subscriptions": "Media Subscriptions",
  "hr-job-platforms": "HR & Job Platforms",
  "online-course": "Online Course / Learning",
  "entertainment-streaming": "Entertainment & Streaming",
  // veteran
  "ai-ml": "AI & Machine Learning",
  "fintech-investment": "FinTech & Investment",
  "edtech-large": "EdTech (Large Scale)",
  cybersecurity: "Cybersecurity",
  "b2b-saas": "B2B SaaS",
  "automation-workflow": "Automation & Workflow Tools",
  "social-platforms": "Social Platforms",
  "healthcare-tech": "Healthcare Technology",
  "marketplace-ecosystems": "Marketplace Ecosystems",
  "data-analytics": "Data & Analytics Companies",
};

const PROJECT_TYPE_SLUG_TO_DISPLAY: Record<string, string> = {
  // beginner (all universal)
  "portfolio-website": "Portfolio Website",
  "landing-page": "Landing Page",
  "simple-blog": "Simple Blog Website",
  "product-showcase": "Product / Service Showcase Page",
  "restaurant-menu": "Restaurant Menu Website",
  "gallery-showcase": "Gallery / Media Showcase",
  "contact-form": "Contact Form Website",
  "personal-bio": "Single-page Personal Bio Site",
  "event-invitation": "Event Invitation / Info Website",
  "basic-info": "Basic Info Website (Static)",
  // intermediate universal
  "dashboard-analytics": "Dashboard / Analytics Panel",
  "booking-system": "Booking or Appointment System",
  "blogging-cms": "Blogging Platform with CMS",
  "membership-website": "Membership Website",
  "chat-messaging": "Chat / Messaging Web App",
  "course-platform": "Course Platform (Mini LMS)",
  // intermediate industry-specific
  "ecommerce-shop": "E-commerce Website / Shop System",
  "real-estate-listing": "Real Estate Listing Website",
  "food-delivery-app": "Food Delivery Web App",
  "job-portal": "Job Portal / Recruitment System",
  "travel-booking": "Travel Booking System",
  // veteran universal
  "enterprise-dashboard": "Enterprise Admin Dashboard",
  "data-visualization": "Data Visualization & Analytics Platform",
  "automation-builder": "Automation Workflow Builder",
  "subscription-platform": "Subscription / Credit-Based Platform",
  "api-platform": "API-first Platform / Integration Hub",
  "ai-chatbot": "AI Chatbot / Virtual Assistant System",
  "project-management": "Project Management / Collaboration Tool",
  // veteran industry-specific
  "ai-saas-platform": "AI SaaS Platform",
  "fintech-dashboard": "FinTech Dashboard / Portfolio Tracker",
  "full-lms": "Full LMS (Enterprise)",
  "marketplace-platform": "Marketplace Platform (Multi-vendor)",
  "social-media-platform": "Social Media Platform",
  "cybersecurity-system": "Cybersecurity Monitoring System",
};

// Reverse lookups let the backend also accept display names if any caller
// sends them (backward compatibility with older payload shapes).
const INDUSTRY_DISPLAY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(INDUSTRY_SLUG_TO_DISPLAY).map(([slug, display]) => [display.toLowerCase(), slug]),
);
const PROJECT_TYPE_DISPLAY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PROJECT_TYPE_SLUG_TO_DISPLAY).map(([slug, display]) => [display.toLowerCase(), slug]),
);

// ============================================================================
// 5. Compatibility matrix (single source of truth on the server)
// ----------------------------------------------------------------------------
//   - Every industry/project combination that the frontend offers is accepted.
//   - Everything else is rejected with HTTP 400 so a crafted request cannot
//     produce a nonsensical combination.
// ============================================================================
const INDUSTRIES_BY_LEVEL: Record<Level, readonly string[]> = {
  beginner: [
    "personal-branding",
    "local-business",
    "blogging-content",
    "portfolio-creative",
    "education-tutors",
    "restaurant-cafe",
    "fitness-wellness",
    "photography",
    "travel-diaries",
    "event-celebrations",
  ],
  intermediate: [
    "ecommerce-retail",
    "healthcare-fitness",
    "real-estate",
    "travel-hospitality",
    "saas-productivity",
    "food-delivery",
    "media-news",
    "media-subscriptions",
    "hr-job-platforms",
    "online-course",
    "entertainment-streaming",
  ],
  veteran: [
    "ai-ml",
    "fintech-investment",
    "edtech-large",
    "cybersecurity",
    "b2b-saas",
    "automation-workflow",
    "social-platforms",
    "healthcare-tech",
    "marketplace-ecosystems",
    "data-analytics",
  ],
};

// Project types that are universally available for that level.
const UNIVERSAL_PROJECT_TYPES_BY_LEVEL: Record<Level, readonly string[]> = {
  beginner: [
    "portfolio-website",
    "landing-page",
    "simple-blog",
    "product-showcase",
    "restaurant-menu",
    "gallery-showcase",
    "contact-form",
    "personal-bio",
    "event-invitation",
    "basic-info",
  ],
  intermediate: [
    "dashboard-analytics",
    "booking-system",
    "blogging-cms",
    "membership-website",
    "chat-messaging",
    "course-platform",
  ],
  veteran: [
    "enterprise-dashboard",
    "data-visualization",
    "automation-builder",
    "subscription-platform",
    "api-platform",
    "ai-chatbot",
    "project-management",
  ],
};

// Project types that only make sense for a specific subset of industries.
// Key = project-type slug, value = list of compatible industry slugs.
const INDUSTRY_SPECIFIC_PROJECT_TYPES_BY_LEVEL: Record<Level, Record<string, string[]>> = {
  beginner: {},
  intermediate: {
    "ecommerce-shop": ["ecommerce-retail", "media-subscriptions", "saas-productivity"],
    "real-estate-listing": ["real-estate"],
    "food-delivery-app": ["food-delivery"],
    "job-portal": ["hr-job-platforms", "media-news", "saas-productivity"],
    "travel-booking": ["travel-hospitality"],
  },
  veteran: {
    "ai-saas-platform": ["ai-ml", "b2b-saas", "data-analytics"],
    "fintech-dashboard": ["fintech-investment"],
    "full-lms": ["edtech-large"],
    "marketplace-platform": ["marketplace-ecosystems"],
    "social-media-platform": ["social-platforms"],
    "cybersecurity-system": ["cybersecurity"],
  },
};

// ============================================================================
// 6. Input normalization + validation
// ============================================================================
function sanitizeString(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function findAlias(body: Record<string, unknown>, aliases: string[]): unknown {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] != null) {
      return body[key];
    }
  }
  // Case-insensitive fallback so "Level"/"level" etc. all resolve.
  const lower = new Map<string, string>();
  for (const k of Object.keys(body)) lower.set(k.toLowerCase(), k);
  for (const key of aliases) {
    const actualKey = lower.get(key.toLowerCase());
    if (actualKey && body[actualKey] != null) return body[actualKey];
  }
  return undefined;
}

type NormalizedRequest = {
  level: Level;
  industrySlug: string;
  projectTypeSlug: string;
  industryDisplay: string;
  projectTypeDisplay: string;
};

const INVALID_REQ_MSG = "Please select a valid level, industry, and project type.";

function normalizeAndValidate(rawBody: unknown): NormalizedRequest {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    throw new HttpError(400, "INVALID_REQUEST", INVALID_REQ_MSG);
  }
  const body = rawBody as Record<string, unknown>;

  const levelRaw = findAlias(body, ["level", "Level"]);
  const industryRaw = findAlias(body, ["industry", "Industry"]);
  const projectTypeRaw = findAlias(body, ["project_type", "projectType", "projecttype", "ProjectType"]);

  // Required — do NOT default to legacy beginner/website/general.
  if (levelRaw == null || industryRaw == null || projectTypeRaw == null) {
    throw new HttpError(400, "INVALID_REQUEST", INVALID_REQ_MSG);
  }

  const level = sanitizeString(levelRaw).toLowerCase();
  const industryRawStr = sanitizeString(industryRaw);
  const projectTypeRawStr = sanitizeString(projectTypeRaw);

  if (!level || !industryRawStr || !projectTypeRawStr) {
    throw new HttpError(400, "INVALID_REQUEST", INVALID_REQ_MSG);
  }
  if (industryRawStr.length > MAX_FIELD_LENGTH || projectTypeRawStr.length > MAX_FIELD_LENGTH) {
    throw new HttpError(400, "INVALID_REQUEST", "Industry and project type must be under 120 characters.");
  }

  if (!(LEVELS as readonly string[]).includes(level)) {
    throw new HttpError(400, "INVALID_REQUEST", INVALID_REQ_MSG);
  }
  const lvl = level as Level;

  // Resolve industry: accept either slug or display name (case-insensitive for display).
  let industrySlug = industryRawStr;
  if (!INDUSTRY_SLUG_TO_DISPLAY[industrySlug]) {
    const reverse = INDUSTRY_DISPLAY_TO_SLUG[industryRawStr.toLowerCase()];
    if (reverse) industrySlug = reverse;
  }
  const industryDisplay = INDUSTRY_SLUG_TO_DISPLAY[industrySlug];
  if (!industryDisplay) throw new HttpError(400, "INVALID_REQUEST", INVALID_REQ_MSG);

  // Resolve project type similarly.
  let projectTypeSlug = projectTypeRawStr;
  if (!PROJECT_TYPE_SLUG_TO_DISPLAY[projectTypeSlug]) {
    const reverse = PROJECT_TYPE_DISPLAY_TO_SLUG[projectTypeRawStr.toLowerCase()];
    if (reverse) projectTypeSlug = reverse;
  }
  const projectTypeDisplay = PROJECT_TYPE_SLUG_TO_DISPLAY[projectTypeSlug];
  if (!projectTypeDisplay) throw new HttpError(400, "INVALID_REQUEST", INVALID_REQ_MSG);

  // Level-appropriate industry check.
  if (!INDUSTRIES_BY_LEVEL[lvl].includes(industrySlug)) {
    throw new HttpError(400, "INVALID_REQUEST", `The industry "${industryDisplay}" is not available at the ${lvl} level.`);
  }

  // Level-appropriate project type check + industry compatibility.
  const universal = UNIVERSAL_PROJECT_TYPES_BY_LEVEL[lvl];
  const industrySpecific = INDUSTRY_SPECIFIC_PROJECT_TYPES_BY_LEVEL[lvl];

  if (universal.includes(projectTypeSlug)) {
    return { level: lvl, industrySlug, projectTypeSlug, industryDisplay, projectTypeDisplay };
  }

  const allowedIndustries = industrySpecific[projectTypeSlug];
  if (!allowedIndustries) {
    throw new HttpError(400, "INVALID_REQUEST", `The project type "${projectTypeDisplay}" is not available at the ${lvl} level.`);
  }
  if (!allowedIndustries.includes(industrySlug)) {
    throw new HttpError(
      400,
      "INCOMPATIBLE_COMBINATION",
      `The project type "${projectTypeDisplay}" is not compatible with the industry "${industryDisplay}".`,
    );
  }

  return { level: lvl, industrySlug, projectTypeSlug, industryDisplay, projectTypeDisplay };
}

// ============================================================================
// 7. Prompt builder — preserves realistic client-brief simulation quality
// ============================================================================
function buildProjectBriefPrompt(input: NormalizedRequest): string {
  const { level, industryDisplay, projectTypeDisplay } = input;

  const levelGuidance: Record<Level, string> = {
    beginner:
      "Scope the project so a beginner developer could complete it: clear page structure, basic forms, straightforward navigation, minimal state, no complex back-end or authentication system, and a small number of well-defined screens.",
    intermediate:
      "Scope the project for an intermediate developer: multiple flows, dashboards, dynamic content, moderate data interactions, and realistic application logic (search, filters, roles, or CMS — pick what fits this project type).",
    veteran:
      "Scope the project for a veteran developer: complex workflows, multi-role systems, non-trivial business logic, integration points, analytics or scale-thinking where appropriate. Do NOT make every Veteran brief identical — tailor the architecture to the industry and project type.",
  };

  const orderPageGuidance =
    `The "order_page" field is a compatibility field. Do NOT literally force an "Order Page". ` +
    `Describe the project's primary transaction / conversion / booking / request / inquiry flow ` +
    `in a way that matches this specific business model (commerce → checkout; restaurant → order/reserve; ` +
    `travel → booking; SaaS → onboarding/subscription conversion; marketplace → transaction/request; ` +
    `service → inquiry/contact/conversion; media → primary engagement/conversion).`;

  return [
    "You are an expert AI project brief generator and creative project manager.",
    "",
    "Produce ONE realistic client project brief. It should feel like a genuine business request a developer could actually receive and build — not a generic AI website idea. Treat it as a project proposal from a real (fictional) client prepared by a professional project manager.",
    "",
    "Context:",
    `- Developer Level: ${level}`,
    `- Project Type: ${projectTypeDisplay}`,
    `- Industry: ${industryDisplay}`,
    "",
    "Hard requirements:",
    "1. Invent a fictional but believable company that NATURALLY belongs to the industry above. The name, tagline, slogan, location, colors, and design style must fit this specific business.",
    "2. Every section must describe the SAME company and business case. Do not generate sections independently.",
    "3. Match the technical scope and complexity to the developer level.",
    `   Level guidance: ${levelGuidance[level]}`,
    "4. Match the primary user flow to the selected project type. Do not frame every brief as a generic 'build a modern website' exercise.",
    "5. Use professional, specific, slightly creative, client-facing language. Avoid repetitive AI filler such as 'Build a modern website…', 'Create a user-friendly website…', 'Make it responsive and attractive…' unless a section genuinely requires it.",
    `6. ${orderPageGuidance}`,
    "7. Return STRICT JSON only. No markdown fences, no commentary, no explanation.",
    "8. Return EXACTLY these 14 top-level fields:",
    "   - 12 fields are single non-empty strings: company_name, tagline, slogan, location,",
    "     intro, objective, requirement_design, about_page, home_page, order_page, audience, tips.",
    "   - 2 fields MUST be ARRAYS OF STRINGS (never a single comma-joined string):",
    '     primary_color_palette  -> e.g. ["#2E8B57", "#F5F5F5", "#222222"]',
    '     design_style_keywords  -> e.g. ["minimalist", "modern", "eco-friendly", "responsive"]',
    "",
    "Field definitions:",
    "- company_name: believable organization / product name that fits the industry.",
    "- tagline: concise brand / value statement.",
    "- slogan: short memorable marketing line (distinct from the tagline).",
    "- location: plausible city/region relevant to this fictional business.",
    "- primary_color_palette: ARRAY of 3-6 color values / directions (hex codes preferred, e.g. \"#2E8B57\") that suit this specific brand. Each element is one color string.",
    "- design_style_keywords: ARRAY of 3-6 concrete visual/design keyword strings (e.g. \"minimalist\", \"brutalist\", \"soft-rounded\") — not a single sentence and not only generic adjectives.",
    "- intro: client-facing description of the company and project context.",
    "- objective: what the client wants to achieve and why this project matters to their business.",
    "- requirement_design: detailed functional + design requirements appropriate to the level and project type.",
    "- about_page: what the About experience should communicate about this company.",
    "- home_page: homepage content structure and what the primary user should prioritize.",
    "- order_page: the primary transaction / conversion / booking / request / inquiry flow, adapted to the business.",
    "- audience: specific target users or customers for this business.",
    "- tips: practical implementation guidance, considerations, or client expectations a developer should know.",
    "",
    "Internal consistency checklist (verify before answering):",
    "- Company identity matches the industry.",
    "- Audience matches the business.",
    "- Homepage content reflects the stated objective.",
    "- The order_page flow matches the actual business model.",
    "- Design direction supports the brand identity.",
    "",
    "Now generate the project brief for:",
    `  Level = ${level}`,
    `  Industry = ${industryDisplay}`,
    `  Project Type = ${projectTypeDisplay}`,
    "",
    "Return only the JSON object with the 14 fields.",
  ].join("\n");
}

// ============================================================================
// 8. Structured output validation
// ============================================================================
// The established application contract treats two fields as ARRAY OF STRINGS
// (the frontend renders each palette swatch / design keyword as a chip):
//   - primary_color_palette
//   - design_style_keywords
// All other brief fields are single strings.
const BRIEF_ARRAY_FIELDS = ["primary_color_palette", "design_style_keywords"] as const;

const BRIEF_FIELDS = [
  "company_name",
  "tagline",
  "slogan",
  "location",
  "primary_color_palette",
  "design_style_keywords",
  "intro",
  "objective",
  "requirement_design",
  "about_page",
  "home_page",
  "order_page",
  "audience",
  "tips",
] as const;

type BriefField = typeof BRIEF_FIELDS[number];
type BriefArrayField = typeof BRIEF_ARRAY_FIELDS[number];
type BriefStringField = Exclude<BriefField, BriefArrayField>;

type ProjectBrief = {
  [K in BriefStringField]: string;
} & {
  [K in BriefArrayField]: string[];
};

const ARRAY_FIELD_SET = new Set<string>(BRIEF_ARRAY_FIELDS as readonly string[]);

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: Object.fromEntries(
    BRIEF_FIELDS.map((f) =>
      ARRAY_FIELD_SET.has(f)
        ? [f, { type: "ARRAY", items: { type: "STRING" } }]
        : [f, { type: "STRING" }],
    ),
  ),
  required: [...BRIEF_FIELDS],
  propertyOrdering: [...BRIEF_FIELDS],
};

function stripMarkdownFences(text: string): string {
  // Defensive last-resort cleanup. The prompt already requires strict JSON.
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "");
    if (t.endsWith("```")) t = t.slice(0, -3);
    t = t.trim();
  }
  return t;
}

type BriefValidation =
  | { ok: true; value: ProjectBrief }
  | { ok: false; reason: string };

function validateProjectBrief(text: string): BriefValidation {
  if (!text || text.trim().length === 0) {
    return { ok: false, reason: "Empty provider output" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = JSON.parse(stripMarkdownFences(text));
    } catch {
      return { ok: false, reason: "Provider output is not valid JSON" };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "Provider output is not a JSON object" };
  }

  const obj = parsed as Record<string, unknown>;
  const out: Record<string, string | string[]> = {};

  for (const field of BRIEF_FIELDS) {
    const v = obj[field];

    if (ARRAY_FIELD_SET.has(field)) {
      // Array-of-non-empty-strings contract. Reject strings/objects/null.
      if (!Array.isArray(v) || v.length === 0) {
        return { ok: false, reason: `Field "${field}" must be a non-empty array of strings` };
      }
      const arr: string[] = [];
      for (const item of v) {
        if (typeof item !== "string" || item.trim().length === 0) {
          return { ok: false, reason: `Field "${field}" must contain only non-empty strings` };
        }
        arr.push(item.trim());
      }
      out[field] = arr;
    } else {
      if (typeof v !== "string") {
        return { ok: false, reason: `Field "${field}" is not a string` };
      }
      if (v.trim().length === 0) {
        return { ok: false, reason: `Field "${field}" is empty` };
      }
      out[field] = v;
    }
  }

  return { ok: true, value: out as unknown as ProjectBrief };
}

// ============================================================================
// 9. Provider abstraction (types + normalization)
// ============================================================================
type ProviderName = "gemini" | "openrouter";

type ProviderResult =
  | { ok: true; provider: ProviderName; text: string; providerRequestId?: string }
  | {
      ok: false;
      provider: ProviderName;
      errorType: string;
      retryable: boolean;
      reason: string;
      providerRequestId?: string;
    };

function truncate(s: string, n = 240): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// ============================================================================
// 10. Gemini (PRIMARY)
// ============================================================================
async function callGemini(prompt: string): Promise<ProviderResult> {
  if (!GEMINI_API_KEY) {
    // Broken deployment configuration — non-retryable from the provider
    // perspective. Fallback would not fix a missing secret.
    return {
      ok: false,
      provider: "gemini",
      errorType: "MISSING_CONFIG",
      retryable: false,
      reason: "GEMINI_API_KEY is not configured on the server",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0.9,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    return {
      ok: false,
      provider: "gemini",
      errorType: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
      retryable: true,
      reason: isAbort ? "Gemini request timed out" : `Gemini network failure: ${(err as Error)?.message ?? "unknown"}`,
    };
  }
  clearTimeout(timeoutId);

  const providerRequestId = res.headers.get("x-request-id") ?? undefined;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const status = res.status;
    const retryable = status === 408 || status === 425 || status === 429 || (status >= 500 && status < 600);
    return {
      ok: false,
      provider: "gemini",
      errorType: `HTTP_${status}`,
      retryable,
      reason: `Gemini HTTP ${status}: ${truncate(body)}`,
      providerRequestId,
    };
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      provider: "gemini",
      errorType: "INVALID_RESPONSE",
      retryable: true,
      reason: "Gemini returned a non-JSON success response",
      providerRequestId,
    };
  }

  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("")
    : "";

  if (!text || text.trim().length === 0) {
    const blocked = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason;
    return {
      ok: false,
      provider: "gemini",
      errorType: blocked ? `BLOCKED_${blocked}` : "EMPTY_CONTENT",
      retryable: true,
      reason: blocked ? `Gemini blocked the response (${blocked})` : "Gemini returned empty content",
      providerRequestId,
    };
  }

  return { ok: true, provider: "gemini", text, providerRequestId };
}

// ============================================================================
// 11. OpenRouter (SECONDARY FALLBACK)
// ============================================================================
async function callOpenRouter(prompt: string): Promise<ProviderResult> {
  if (!OPENROUTER_API_KEY) {
    return {
      ok: false,
      provider: "openrouter",
      errorType: "MISSING_CONFIG",
      retryable: false,
      reason: "OPENROUTER_API_KEY is not configured on the server",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://trial-clients.vercel.app",
        "X-Title": "tRIAL-CLIENTS",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.9,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    return {
      ok: false,
      provider: "openrouter",
      errorType: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
      retryable: false,
      reason: isAbort ? "OpenRouter request timed out" : `OpenRouter network failure: ${(err as Error)?.message ?? "unknown"}`,
    };
  }
  clearTimeout(timeoutId);

  const providerRequestId = res.headers.get("x-request-id") ?? undefined;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const status = res.status;
    // Any OpenRouter failure at this point is terminal for the request
    // (we already fell back from Gemini).
    return {
      ok: false,
      provider: "openrouter",
      errorType: `HTTP_${status}`,
      retryable: false,
      reason: `OpenRouter HTTP ${status}: ${truncate(body)}`,
      providerRequestId,
    };
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      provider: "openrouter",
      errorType: "INVALID_RESPONSE",
      retryable: false,
      reason: "OpenRouter returned a non-JSON success response",
      providerRequestId,
    };
  }

  const text = json?.choices?.[0]?.message?.content ?? "";
  if (!text || (typeof text === "string" && text.trim().length === 0)) {
    return {
      ok: false,
      provider: "openrouter",
      errorType: "EMPTY_CONTENT",
      retryable: false,
      reason: "OpenRouter returned empty content",
      providerRequestId,
    };
  }

  return { ok: true, provider: "openrouter", text: String(text), providerRequestId };
}

// ============================================================================
// 12. Provider selection algorithm
// ============================================================================
// Gemini -> (retryable failure OR Gemini-invalid-schema) -> OpenRouter once -> Stop.
type GenerationOutcome =
  | { success: true; brief: ProjectBrief; provider: ProviderName; usedFallback: boolean }
  | {
      success: false;
      status: number;
      code: string;
      publicMessage: string;
      internalReason: string;
      provider: ProviderName;
      usedFallback: boolean;
    };

function mapProviderFailureToHttp(result: ProviderResult): { status: number; code: string; publicMessage: string } {
  if (result.ok) return { status: 500, code: "UNEXPECTED", publicMessage: "Something went wrong while generating the project brief." };
  switch (result.errorType) {
    case "MISSING_CONFIG":
      return {
        status: 500,
        code: "PROVIDER_CONFIG_ERROR",
        publicMessage: "Something went wrong while generating the project brief.",
      };
    case "HTTP_429":
    case "RATE_LIMIT":
      return {
        status: 429,
        code: "RATE_LIMITED",
        publicMessage: "Too many generation requests were received. Please try again shortly.",
      };
    case "TIMEOUT":
    case "NETWORK_ERROR":
    case "EMPTY_CONTENT":
    case "INVALID_RESPONSE":
    case "HTTP_500":
    case "HTTP_502":
    case "HTTP_503":
    case "HTTP_504":
      return {
        status: 503,
        code: "PROVIDER_UNAVAILABLE",
        publicMessage: "Project brief generation is temporarily unavailable. Please try again.",
      };
    default:
      return {
        status: 503,
        code: "PROVIDER_UNAVAILABLE",
        publicMessage: "Project brief generation is temporarily unavailable. Please try again.",
      };
  }
}

/**
 * Attempts OpenRouter as a single fallback attempt.
 * Call this ONLY after Gemini has failed (retryable) or produced an
 * invalid schema. Never call this in parallel with Gemini.
 *
 * `noFallbackReason` is the internal reason string used when OPENROUTER_API_KEY
 * is not configured (so Gemini was the only provider and it failed).
 */
async function fallbackToOpenRouter(
  prompt: string,
  startedAt: number,
  requestId: string,
  userId: string,
  level: Level,
  industry: string,
  projectType: string,
  noFallbackReason: string,
): Promise<GenerationOutcome> {
  // No fallback configured — return the original provider failure reason.
  if (!OPENROUTER_API_KEY) {
    console.warn(JSON.stringify({
      event: "generate.no_fallback_configured",
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
    }));
    return {
      success: false,
      status: 503,
      code: "PROVIDER_UNAVAILABLE",
      publicMessage: "Project brief generation is temporarily unavailable. Please try again.",
      internalReason: noFallbackReason,
      provider: "gemini",
      usedFallback: false,
    };
  }

  const fallback = await callOpenRouter(prompt);

  // Narrow by checking !fallback.ok first so TypeScript knows the variant.
  if (!fallback.ok) {
    const mapped = mapProviderFailureToHttp(fallback);
    console.error(JSON.stringify({
      event: "generate.failure",
      request_id: requestId,
      provider: "openrouter",
      fallback_used: true,
      code: mapped.code,
      reason: fallback.reason,
      duration_ms: Date.now() - startedAt,
      success: false,
    }));
    return {
      success: false,
      status: mapped.status,
      code: mapped.code,
      publicMessage: mapped.publicMessage,
      internalReason: fallback.reason,
      provider: "openrouter",
      usedFallback: true,
    };
  }

  // fallback.ok === true — TypeScript has narrowed to the success variant.
  const validated = validateProjectBrief(fallback.text);
  if (validated.ok) {
    console.log(JSON.stringify({
      event: "generate.success",
      request_id: requestId,
      user_id: userId,
      level,
      industry,
      project_type: projectType,
      provider: "openrouter",
      fallback_used: true,
      duration_ms: Date.now() - startedAt,
      success: true,
    }));
    return { success: true, brief: validated.value, provider: "openrouter", usedFallback: true };
  }

  console.error(JSON.stringify({
    event: "generate.failure",
    request_id: requestId,
    provider: "openrouter",
    fallback_used: true,
    code: "PROVIDER_INVALID_OUTPUT",
    reason: validated.reason,
    duration_ms: Date.now() - startedAt,
    success: false,
  }));
  return {
    success: false,
    status: 503,
    code: "PROVIDER_INVALID_OUTPUT",
    publicMessage: "Project brief generation is temporarily unavailable. Please try again.",
    internalReason: `OpenRouter schema invalid: ${validated.reason}`,
    provider: "openrouter",
    usedFallback: true,
  };
}

async function generateBriefWithFallback(
  prompt: string,
  requestId: string,
  userId: string,
  level: Level,
  industry: string,
  projectType: string,
): Promise<GenerationOutcome> {
  const startedAt = Date.now();

  // 1. Gemini (primary)
  const geminiResult = await callGemini(prompt);

  if (geminiResult.ok) {
    // TypeScript narrows geminiResult to the success variant here.
    const validated = validateProjectBrief(geminiResult.text);
    if (validated.ok) {
      console.log(JSON.stringify({
        event: "generate.success",
        request_id: requestId,
        user_id: userId,
        level,
        industry,
        project_type: projectType,
        provider: "gemini",
        fallback_used: false,
        duration_ms: Date.now() - startedAt,
        success: true,
      }));
      return { success: true, brief: validated.value, provider: "gemini", usedFallback: false };
    }
    // Gemini returned 200 but schema is unusable — attempt OpenRouter once.
    console.warn(JSON.stringify({
      event: "generate.invalid_schema",
      request_id: requestId,
      provider: "gemini",
      reason: validated.reason,
    }));
    return fallbackToOpenRouter(
      prompt, startedAt, requestId, userId, level, industry, projectType,
      "Gemini returned malformed brief and no fallback is configured",
    );
  }

  // geminiResult.ok is false — TypeScript narrows to the failure variant here
  // because the if (geminiResult.ok) block above always returns.
  console.warn(JSON.stringify({
    event: "generate.gemini_failure",
    request_id: requestId,
    error_type: geminiResult.errorType,
    retryable: geminiResult.retryable,
    reason: geminiResult.reason,
  }));

  if (!geminiResult.retryable) {
    // Non-retryable (broken config, bad request) — no fallback attempt.
    const mapped = mapProviderFailureToHttp(geminiResult);
    console.error(JSON.stringify({
      event: "generate.failure",
      request_id: requestId,
      provider: "gemini",
      fallback_used: false,
      code: mapped.code,
      duration_ms: Date.now() - startedAt,
      success: false,
    }));
    return {
      success: false,
      status: mapped.status,
      code: mapped.code,
      publicMessage: mapped.publicMessage,
      internalReason: geminiResult.reason,
      provider: "gemini",
      usedFallback: false,
    };
  }

  // Retryable Gemini failure — attempt OpenRouter once.
  return fallbackToOpenRouter(
    prompt, startedAt, requestId, userId, level, industry, projectType,
    `Gemini retryable failure: ${geminiResult.reason}`,
  );
}

// ============================================================================
// 13. Main HTTP handler
// ============================================================================
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Stable per-request identifier for safe logging + support.
  const requestId = crypto.randomUUID();

  try {
    // ---------------------------------------------------------------------
    // A. Authentication (unchanged from previous implementation)
    // ---------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "UNAUTHENTICATED", "Unauthorized: Missing authorization header", corsHeaders);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return errorResponse(401, "UNAUTHENTICATED", "Unauthorized: Invalid token", corsHeaders);
    }
    const userId = user.id;

    // ---------------------------------------------------------------------
    // B. Maintenance-mode + user status (unchanged)
    // ---------------------------------------------------------------------
    const { data: maintenanceData } = await supabaseClient
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();
    const maintenanceEnabled = (maintenanceData?.value as { enabled?: boolean })?.enabled ?? false;
    if (maintenanceEnabled) {
      const { data: roleData } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) {
        return errorResponse(503, "MAINTENANCE_MODE", "System is under maintenance. Please try again later.", corsHeaders);
      }
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("status, generation_enabled")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      return errorResponse(500, "UNEXPECTED", "Failed to verify user status", corsHeaders);
    }
    if (profile?.status === "suspended") {
      return errorResponse(403, "USER_SUSPENDED", "Your account has been suspended. Contact support for assistance.", corsHeaders);
    }
    if (profile?.generation_enabled === false) {
      return errorResponse(403, "GENERATION_DISABLED", "Project generation has been disabled for your account.", corsHeaders);
    }

    // ---------------------------------------------------------------------
    // C. Parse body + normalize + validate + compatibility check
    // ---------------------------------------------------------------------
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse(400, "INVALID_REQUEST", "Invalid JSON payload", corsHeaders);
    }

    // normalizeAndValidate() already rejects non-object payloads with HTTP 400.
    const normalized = normalizeAndValidate(rawBody);
    const { level, industrySlug, projectTypeSlug, industryDisplay, projectTypeDisplay } = normalized;

    console.log(JSON.stringify({
      event: "generate.request",
      request_id: requestId,
      user_id: userId,
      level,
      industry: industrySlug,
      project_type: projectTypeSlug,
    }));

    // ---------------------------------------------------------------------
    // D. Quota availability check (unchanged; NO deduction here)
    // ---------------------------------------------------------------------
    const { data: quotaCheckResult, error: quotaCheckError } = await supabaseClient.rpc(
      "check_quota_availability",
      { _user_id: userId, _level: level },
    );
    if (quotaCheckError) {
      return errorResponse(500, "UNEXPECTED", "Failed to check quota", corsHeaders);
    }
    if (!quotaCheckResult?.ok) {
      const status = quotaCheckResult?.status ?? 403;
      const code = status === 402 ? "INSUFFICIENT_CREDITS" : (status === 403 ? "FORBIDDEN" : "QUOTA_CHECK_FAILED");
      return errorResponse(
        status,
        code,
        quotaCheckResult?.message ?? "Insufficient credits for this generation.",
        corsHeaders,
      );
    }

    // ---------------------------------------------------------------------
    // E. Create project row with status = 'generating' (unchanged)
    // ---------------------------------------------------------------------
    const { data: project, error: dbError } = await supabaseClient
      .from("projects")
      .insert({
        user_id: userId,
        title: `${projectTypeDisplay} Project`,
        description: `A ${level} level ${projectTypeDisplay} project for ${industryDisplay}`,
        type: projectTypeDisplay,
        level,
        industry: industryDisplay,
        status: "generating",
        brief_data: null,
      })
      .select()
      .single();

    if (dbError || !project) {
      console.error("Database error while creating project:", dbError);
      return errorResponse(500, "UNEXPECTED", "Failed to create project", corsHeaders);
    }

    // ---------------------------------------------------------------------
    // F. Build prompt + generate brief with Gemini primary / OpenRouter fallback
    // ---------------------------------------------------------------------
    const prompt = buildProjectBriefPrompt(normalized);

    const outcome = await generateBriefWithFallback(
      prompt,
      requestId,
      userId,
      level,
      industrySlug,
      projectTypeSlug,
    );

    if (!outcome.success) {
      // Mark the project as failed and DO NOT consume quota/credits.
      await supabaseClient
        .from("projects")
        .update({ status: "failed" })
        .eq("id", project.id);

      console.error(JSON.stringify({
        event: "generate.failed",
        request_id: requestId,
        project_id: project.id,
        status: outcome.status,
        code: outcome.code,
        reason: outcome.internalReason,
      }));

      return errorResponse(outcome.status, outcome.code, outcome.publicMessage, corsHeaders);
    }

    // ---------------------------------------------------------------------
    // G. Persist brief + mark project completed (unchanged field contract)
    // ---------------------------------------------------------------------
    const { error: updateError } = await supabaseClient
      .from("projects")
      .update({ brief_data: outcome.brief, status: "completed" })
      .eq("id", project.id);

    if (updateError) {
      console.error("Failed to update project with brief:", updateError);
      await supabaseClient.from("projects").update({ status: "failed" }).eq("id", project.id);
      return errorResponse(500, "UNEXPECTED", "Failed to save brief data", corsHeaders);
    }

    // ---------------------------------------------------------------------
    // H. Consume quota / credits ONLY after successful generation (unchanged)
    // ---------------------------------------------------------------------
    const { data: consumeResult, error: consumeError } = await supabaseClient.rpc(
      "consume_quota_after_success",
      { _user_id: userId, _level: level },
    );
    if (consumeError) {
      // Do not fail the request — brief is already saved. Log for manual review.
      console.error("Error consuming quota after successful generation:", consumeError);
    } else {
      console.log("Quota/credits consumed after successful generation:", consumeResult);
    }
    const creditsUsed = consumeResult?.credits_used || 0;

    // ---------------------------------------------------------------------
    // I. XP + badges (unchanged)
    // ---------------------------------------------------------------------
    try {
      const { data: xpData, error: xpFetchError } = await supabaseClient
        .from("user_xp")
        .select("total_xp, level")
        .eq("user_id", userId)
        .maybeSingle();

      if (!xpFetchError) {
        const XP_VALUES: Record<string, number> = { beginner: 50, intermediate: 100, veteran: 200 };
        const xpGain = XP_VALUES[level] || 50;
        const currentXP = xpData?.total_xp || 0;
        const currentLevel = xpData?.level || 1;
        const newTotalXP = currentXP + xpGain;
        const newLevel = Math.floor(newTotalXP / 1000) + 1;

        if (xpData) {
          await supabaseClient
            .from("user_xp")
            .update({ total_xp: newTotalXP, level: newLevel })
            .eq("user_id", userId);
        } else {
          await supabaseClient
            .from("user_xp")
            .insert({ user_id: userId, total_xp: xpGain, level: newLevel });
        }

        await supabaseClient
          .from("xp_events")
          .insert({ user_id: userId, event_type: "project_created", xp_gained: xpGain });

        const { count: projectCount } = await supabaseClient
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (projectCount === 1) {
          await supabaseClient
            .from("user_badges")
            .insert({ user_id: userId, badge_type: "first_project" });
        }
      }
    } catch (xpError) {
      console.error("Error awarding XP:", xpError);
    }

    // ---------------------------------------------------------------------
    // J. Success response (unchanged shape so the existing UI keeps working)
    // ---------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        ok: true,
        status: 200,
        id: project.id,
        message: "Project created and brief generated successfully",
        credits_used: creditsUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    return safeErrorFromException(err, corsHeaders);
  }
});
