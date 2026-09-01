import { canonicalTagValue } from "./tag-normalization.mjs";
function emptyDimensions() {
  return {
    repositories: {},
    regions: {},
    countries: {},
    tags: {},
    authors: {},
    jobCountries: {},
    jobRegions: {},
    workModels: {},
    areas: {},
    technologies: {},
    seniority: {},
    employmentTypes: {},
    languages: {},
    freshness: {},
    salaryDisclosed: {},
  };
}
function pushId(target, key, id) {
  if (!key) return;
  target[key] = target[key] ?? [];
  if (!target[key].includes(id)) target[key].push(id);
}

function sortedCountRecord(values) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, ids]) => [key, ids.length])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function buildFacetIndex(items) {
  const dimensions = emptyDimensions();
  const authorLabels = {};
  const tagLabels = {};

  for (const item of items) {
    for (const repository of new Set([
      item.repository,
      ...(item.sources ?? []).map((source) => source.repository),
    ].filter(Boolean))) {
      pushId(dimensions.repositories, repository, item.id);
    }
    pushId(dimensions.regions, item.region, item.id);
    pushId(dimensions.countries, item.country, item.id);
    pushId(dimensions.authors, item.author?.handle, item.id);
    pushId(dimensions.jobCountries, item.jobLocation?.country, item.id);
    pushId(dimensions.jobRegions, item.jobLocation?.region, item.id);
    pushId(dimensions.freshness, item.freshness?.status, item.id);
    for (const days of [7, 30, 90]) {
      if (item.freshness?.ageDays <= days) pushId(dimensions.freshness, String(days), item.id);
    }
    pushId(dimensions.salaryDisclosed, item.salary ? "true" : "false", item.id);

    for (const value of item.taxonomy?.workModels ?? []) pushId(dimensions.workModels, value, item.id);
    for (const value of item.taxonomy?.areas ?? []) pushId(dimensions.areas, value, item.id);
    for (const value of item.taxonomy?.technologies ?? []) pushId(dimensions.technologies, value, item.id);
    for (const value of item.taxonomy?.seniority ?? []) pushId(dimensions.seniority, value, item.id);
    for (const value of item.taxonomy?.employmentTypes ?? []) pushId(dimensions.employmentTypes, value, item.id);
    for (const value of item.taxonomy?.languages ?? []) pushId(dimensions.languages, value, item.id);

    if (item.author?.handle) {
      authorLabels[item.author.handle] = item.author.name || item.author.handle;
    }

    for (const rawTag of item.tags ?? []) {
      const tag = canonicalTagValue(rawTag);
      if (!tag) continue;
      pushId(dimensions.tags, tag, item.id);
      tagLabels[tag] = tagLabels[tag] ?? rawTag;
    }
  }

  return { dimensions, labels: { authors: authorLabels, tags: tagLabels } };
}

export function buildFacetSummary(facetIndex) {
  return {
    repositories: sortedCountRecord(facetIndex.dimensions.repositories),
    regions: sortedCountRecord(facetIndex.dimensions.regions),
    countries: sortedCountRecord(facetIndex.dimensions.countries),
    tags: sortedCountRecord(facetIndex.dimensions.tags),
    authors: sortedCountRecord(facetIndex.dimensions.authors),
    authorLabels: facetIndex.labels.authors,
    jobCountries: sortedCountRecord(facetIndex.dimensions.jobCountries),
    jobRegions: sortedCountRecord(facetIndex.dimensions.jobRegions),
    workModels: sortedCountRecord(facetIndex.dimensions.workModels),
    areas: sortedCountRecord(facetIndex.dimensions.areas),
    technologies: sortedCountRecord(facetIndex.dimensions.technologies),
    seniority: sortedCountRecord(facetIndex.dimensions.seniority),
    employmentTypes: sortedCountRecord(facetIndex.dimensions.employmentTypes),
    languages: sortedCountRecord(facetIndex.dimensions.languages),
    freshness: sortedCountRecord(facetIndex.dimensions.freshness),
    salaryDisclosed: sortedCountRecord(facetIndex.dimensions.salaryDisclosed),
  };
}
