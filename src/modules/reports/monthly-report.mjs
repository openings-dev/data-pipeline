function requireRecord(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

function requireText(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

function requireCount(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

function rankedFacet(values, key, limit = Number.POSITIVE_INFINITY) {
  return Object.entries(requireRecord(values, `${key} facets`))
    .map(([label, openOpportunities]) => ({
      [key]: label,
      openOpportunities: requireCount(openOpportunities, `${key} ${label}`),
    }))
    .filter(({ openOpportunities }) => openOpportunities > 0)
    .sort((left, right) =>
      right.openOpportunities - left.openOpportunities ||
      left[key].localeCompare(right[key]),
    )
    .slice(0, limit);
}

export function buildMonthlyReport(manifest) {
  const source = requireRecord(manifest, "opportunity manifest");
  const totals = requireRecord(source.totals, "manifest totals");
  const facets = requireRecord(source.facets, "manifest facets");
  const generatedAt = requireText(source.generatedAt, "manifest generatedAt");
  const generatedDate = new Date(generatedAt);
  if (Number.isNaN(generatedDate.getTime())) {
    throw new Error("Invalid manifest generatedAt");
  }

  const reportTotals = {
    openOpportunities: requireCount(totals.openOpportunities, "open opportunities"),
    communities: requireCount(totals.communities, "communities"),
    countries: requireCount(totals.countries, "countries"),
    regions: requireCount(totals.regions, "regions"),
    repositories: requireCount(totals.repositories, "repositories"),
  };
  const salaryFacets = requireRecord(facets.salaryDisclosed, "salary disclosure facets");
  const disclosed = requireCount(salaryFacets.true, "salary disclosed");
  const undisclosed = requireCount(salaryFacets.false, "salary undisclosed");
  const salaryTotal = disclosed + undisclosed;

  return {
    schemaVersion: 1,
    methodologyVersion: 1,
    period: generatedAt.slice(0, 7),
    snapshot: {
      generatedAt,
      dataHash: requireText(source.dataHash, "manifest dataHash"),
    },
    totals: reportTotals,
    topCountries: rankedFacet(facets.countries, "country", 10),
    topTechnologies: rankedFacet(facets.technologies, "technology", 10),
    workModels: rankedFacet(facets.workModels, "model"),
    salaryDisclosure: {
      disclosed,
      undisclosed,
      percentage: salaryTotal === 0 ? 0 : Number(((disclosed / salaryTotal) * 100).toFixed(1)),
    },
  };
}

export function assertMonthlyReportIsImmutable(existing, next) {
  if (JSON.stringify(existing) !== JSON.stringify(next)) {
    throw new Error(`Monthly report ${next.period} is immutable once published`);
  }
}
