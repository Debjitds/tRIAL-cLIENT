import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalise a brief field that the UI renders as a list of chips / swatches.
 *
 * The generation backend's current contract stores `primary_color_palette`
 * and `design_style_keywords` as an ARRAY OF STRINGS. But older project rows
 * (and the interim buggy migration) may store a single comma-joined string,
 * or the value may be missing entirely. This helper lets every render path
 * treat the value as a `string[]` safely without crashing or fabricating data.
 *
 * Rules:
 *   - Array            -> keep only non-empty string entries (trimmed).
 *   - "#a, #b, #c"     -> split on commas / semicolons.
 *   - "#a #b #c"       -> split space-separated hex colour tokens.
 *   - single string    -> wrap as a one-item array (never invent values).
 *   - null/undefined/
 *     unexpected type  -> [].
 */
export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((s) => s.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Preferred: comma / semicolon delimited list.
    const byDelimiter = trimmed
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (byDelimiter.length > 1) return byDelimiter;

    // Single delimited token but looks like space-separated hex colours.
    const hexTokens = trimmed.match(/#[0-9a-fA-F]{3,8}/g);
    if (hexTokens && hexTokens.length > 1) return hexTokens;

    // Fallback: treat as a single item. Do not fabricate extra values.
    return [trimmed];
  }

  return [];
}
