import { readFileSync, existsSync } from "fs";
import path from "path";

interface KnowledgeSource {
  available: boolean;
  base64?: string;
}

let cached: KnowledgeSource | null = null;

/**
 * Loads the $100M Leads source PDF from disk, if the operator has supplied
 * one. Memoized per server process — see docs/architecture.md §4. Never
 * throws: an absent file is a normal, expected v1 configuration (FR5).
 */
export function loadKnowledgeSource(): KnowledgeSource {
  if (cached) return cached;

  const pdfPath = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.LEADS_PDF_PATH || "knowledge/100m-leads.pdf"
  );

  if (!existsSync(pdfPath)) {
    cached = { available: false };
    return cached;
  }

  const base64 = readFileSync(pdfPath).toString("base64");
  cached = { available: true, base64 };
  return cached;
}
