import { sortOpportunitiesByDate } from "../opportunities/opportunity-mapper.mjs";

function countIssueStates(items) {
  const openIssues = items.filter((item) => item.issueState === "open").length;
  return { openIssues, closedIssues: items.length - openIssues };
}

function ensureCountry(countries, countryCode, country, region) {
  if (!countries.has(countryCode)) {
    countries.set(countryCode, { countryCode, country, region, repositories: new Map(), failedRepositories: [] });
  }

  return countries.get(countryCode);
}

/**
 * @param {{legacySnapshot: Record<string, any>; catalogRepositories: Array<Record<string, any>>}} params
 */
export function convertLegacySnapshot(params) {
  const { legacySnapshot, catalogRepositories } = params;
  const catalogByRepository = new Map(catalogRepositories.map((item) => [item.repository, item]));
  const countries = new Map();

  for (const entry of legacySnapshot.byRepository ?? []) {
    const catalog = catalogByRepository.get(entry.repository);
    const countryCode = String(catalog?.countryCode ?? "GLOBAL").toUpperCase();
    const countryNode = ensureCountry(countries, countryCode, catalog?.country ?? entry.country, catalog?.region ?? entry.region);
    countryNode.repositories.set(entry.repository, {
      repository: entry.repository,
      country: countryNode.country,
      countryCode,
      region: countryNode.region,
      items: [],
      issues: entry.issues ?? 0,
      openIssues: entry.openIssues ?? 0,
      closedIssues: entry.closedIssues ?? 0,
    });
  }

  for (const item of legacySnapshot.items ?? []) {
    const catalog = catalogByRepository.get(item.repository);
    const countryCode = String(catalog?.countryCode ?? "GLOBAL").toUpperCase();
    const countryNode = ensureCountry(countries, countryCode, catalog?.country ?? item.country, catalog?.region ?? item.region);
    const repository = countryNode.repositories.get(item.repository) ?? {
      repository: item.repository,
      country: countryNode.country,
      countryCode,
      region: countryNode.region,
      items: [],
      issues: 0,
      openIssues: 0,
      closedIssues: 0,
    };
    repository.items.push(item);
    countryNode.repositories.set(item.repository, repository);
  }

  for (const failed of legacySnapshot.failedRepositories ?? []) {
    const catalog = catalogByRepository.get(failed.repository);
    const countryCode = String(catalog?.countryCode ?? "GLOBAL").toUpperCase();
    const countryNode = ensureCountry(countries, countryCode, catalog?.country ?? "Global", catalog?.region ?? "Global");
    countryNode.failedRepositories.push(failed);
  }

  return Array.from(countries.values()).map((country) => ({
    country: country.country,
    countryCode: country.countryCode,
    region: country.region,
    failedRepositories: country.failedRepositories,
    repositories: Array.from(country.repositories.values()).map((repository) => {
      const items = sortOpportunitiesByDate(repository.items);
      const counts = items.length > 0 ? countIssueStates(items) : repository;
      return { ...repository, items, issues: items.length || repository.issues, ...counts };
    }),
  }));
}
