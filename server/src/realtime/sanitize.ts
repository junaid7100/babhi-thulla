import { RULES } from "../engine/rules";

const HTML_METACHARS = /[<>&"'`]/g;

function stripControlChars(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f) out += ch;
  }
  return out;
}

/** Strips HTML/control characters and enforces the display-name length cap. */
export function sanitizeDisplayName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const stripped = stripControlChars(raw.replace(HTML_METACHARS, "")).trim();
  return stripped.slice(0, RULES.displayNameMaxLength);
}

export function uniqueDisplayName(desired: string, taken: string[]): string {
  if (!taken.includes(desired)) return desired;
  let n = 2;
  while (taken.includes(`${desired} (${n})`)) n += 1;
  return `${desired} (${n})`.slice(0, RULES.displayNameMaxLength + 5);
}
