import { normalizeText } from "../../shared/utils/text.mjs";

export function parseCompanyName(title, body) {
  const source = `${title ?? ""}\n${body ?? ""}`;
  const labeledMatch = source.match(
    /(?:company|empresa|companhia|cliente)\s*[:|-]\s*([^\n|]{2,80})/i,
  );
  if (labeledMatch) {
    const normalized = normalizeText(labeledMatch[1]);
    return normalized.length <= 64 ? normalized : undefined;
  }
  const titleAtMatch = String(title ?? "").match(
    /\b(?:at|na|no)\s+([A-Za-z0-9&.'\- ]{2,64})$/i,
  );
  return titleAtMatch ? normalizeText(titleAtMatch[1]) : undefined;
}

