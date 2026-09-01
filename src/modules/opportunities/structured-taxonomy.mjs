import {
  AREA_PATTERNS,
  EMPLOYMENT_PATTERNS,
  LANGUAGE_PATTERNS,
  OPERATIONAL_LABELS,
  SENIORITY_PATTERNS,
  TECHNOLOGY_PATTERNS,
  WORK_MODEL_PATTERNS,
} from "./taxonomy-patterns.mjs";

function normalized(value) {
  return ` ${String(value ?? "").toLowerCase().normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}+#]+/gu, " ")
    .replace(/\s+/g, " ").trim()} `;
}
function labelKey(value) {
  return normalized(value).trim().replace(/\s+/g, "-");
}

function valuesFor(patterns, text) {
  return Object.entries(patterns)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(normalized(alias))))
    .map(([value]) => value).sort();
}

export function extractStructuredTaxonomy({ title, body, labels = [] }) {
  const discoveryLabels = labels.filter((label) => !OPERATIONAL_LABELS.has(labelKey(label)));
  const text = normalized([title, body, ...discoveryLabels].filter(Boolean).join("\n"));
  return {
    areas: valuesFor(AREA_PATTERNS, text),
    technologies: valuesFor(TECHNOLOGY_PATTERNS, text),
    seniority: valuesFor(SENIORITY_PATTERNS, text),
    employmentTypes: valuesFor(EMPLOYMENT_PATTERNS, text),
    workModels: valuesFor(WORK_MODEL_PATTERNS, text),
    languages: valuesFor(LANGUAGE_PATTERNS, text),
  };
}
