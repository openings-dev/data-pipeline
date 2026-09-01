import { opportunitySource } from "./opportunity-sources.mjs";
import { mergeDataProvenance } from "./data-provenance.mjs";

function timestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function mergeTaxonomy(items) {
  const keys = ["areas", "technologies", "seniority", "employmentTypes", "workModels", "languages"];
  return Object.fromEntries(keys.map((key) => [
    key,
    uniqueSorted(items.flatMap((item) => item.taxonomy?.[key] ?? [])),
  ]));
}

function firstValue(items, key) {
  return items.find((item) => item[key])?.[key];
}

export function canonicalOpportunity(group) {
  const sorted = [...group].sort((left, right) =>
    timestamp(left.createdAt) - timestamp(right.createdAt) || left.id.localeCompare(right.id));
  const primary = sorted[0];
  const updatedAt = [...sorted]
    .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))[0]?.updatedAt;
  const explicitLocation = sorted.find(
    (item) => item.jobLocation?.confidence === "explicit",
  )?.jobLocation;
  const companyName = primary.companyName ?? firstValue(sorted, "companyName");
  const salary = primary.salary ?? firstValue(sorted, "salary");

  return {
    ...primary,
    updatedAt: updatedAt ?? primary.updatedAt,
    ...(explicitLocation ? { jobLocation: explicitLocation } : {}),
    ...(companyName ? { companyName } : {}),
    ...(salary ? { salary } : {}),
    tags: uniqueSorted(sorted.flatMap((item) => item.tags ?? [])),
    sourceTags: uniqueSorted(sorted.flatMap((item) => item.sourceTags ?? item.tags ?? [])),
    taxonomy: mergeTaxonomy(sorted),
    dataProvenance: mergeDataProvenance(sorted),
    sources: sorted.map(opportunitySource),
    deduplication: { sourceCount: sorted.length },
  };
}
