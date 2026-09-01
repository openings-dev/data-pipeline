import { extractJobLocation } from "./job-location.mjs";
import { extractStructuredTaxonomy } from "./structured-taxonomy.mjs";
import { buildDataProvenance } from "./data-provenance.mjs";

export function normalizeDiscoveryOpportunity(item) {
  const sourceLocation = item.sourceLocation ?? {
    country: item.country,
    region: item.region,
  };
  const sourceTags = item.sourceTags ?? item.tags ?? [];
  const jobLocation = item.jobLocation ?? extractJobLocation({
    title: item.title,
    body: item.description,
    sourceLocation,
  });
  const taxonomy = item.taxonomy ?? extractStructuredTaxonomy({
    title: item.title,
    body: item.description,
    labels: sourceTags,
  });
  const legacyDeclaredFields = new Set([
    ...(jobLocation?.confidence === "explicit" ? ["location"] : []),
    ...(jobLocation?.confidence === "explicit" && jobLocation?.workModel
      ? ["workModel"]
      : []),
  ]);
  return {
    ...item,
    sourceLocation,
    sourceTags,
    jobLocation,
    taxonomy,
    dataProvenance: {
      ...buildDataProvenance({
        jobLocation,
        salary: item.salary,
        taxonomy,
        declaredFields: legacyDeclaredFields,
      }),
      ...(item.dataProvenance ?? {}),
    },
  };
}
