function timestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? null : parsed;
}

function itemSources(item) {
  if (Array.isArray(item.sources) && item.sources.length > 0) return item.sources;
  return [{
    repository: item.repository,
    createdAt: item.createdAt,
  }];
}

function summarizeByRepository(items) {
  const summaries = new Map();
  for (const item of items) {
    if (item.issueState !== "open") continue;
    for (const source of itemSources(item)) {
      const current = summaries.get(source.repository) ?? { count: 0, lastPostedAt: null };
      const postedAt = timestamp(source.createdAt);
      current.count += 1;
      if (postedAt !== null && (current.lastPostedAt === null || postedAt > current.lastPostedAt)) {
        current.lastPostedAt = postedAt;
      }
      summaries.set(source.repository, current);
    }
  }
  return summaries;
}

export function buildCommunityStatus(params) {
  const {
    generatedAt,
    repositories,
    items,
    failedRepositories = [],
    previousStatus = null,
    synchronizedRepositories = repositories.map((source) => source.repository),
  } = params;
  const failures = new Set(failedRepositories.map((failure) => failure.repository));
  const synchronized = new Set(synchronizedRepositories);
  const previous = new Map(
    (previousStatus?.items ?? []).map((item) => [item.repository, item]),
  );
  const summaries = summarizeByRepository(items);
  const totals = { communities: repositories.length, healthy: 0, noOpenings: 0, errors: 0 };

  const statusItems = repositories.map((source) => {
    const summary = summaries.get(source.repository) ?? { count: 0, lastPostedAt: null };
    const previousItem = previous.get(source.repository);
    const wasSynchronized = synchronized.has(source.repository);
    const state = failures.has(source.repository) ? "error"
      : wasSynchronized ? (summary.count > 0 ? "healthy" : "no-openings")
        : previousItem?.state ?? "error";
    if (state === "error") totals.errors += 1;
    else if (state === "healthy") totals.healthy += 1;
    else totals.noOpenings += 1;

    return {
      repository: source.repository,
      repositoryUrl: source.url,
      name: source.owner,
      country: source.country,
      countryCode: source.countryCode,
      region: source.region,
      state,
      openOpportunities: wasSynchronized && state !== "error"
        ? summary.count : previousItem?.openOpportunities ?? summary.count,
      lastSuccessfulSyncAt: wasSynchronized && state !== "error"
        ? generatedAt : previousItem?.lastSuccessfulSyncAt ?? null,
      lastPostedAt: wasSynchronized && state !== "error"
        ? summary.lastPostedAt === null ? null : new Date(summary.lastPostedAt).toISOString()
        : previousItem?.lastPostedAt ?? null,
    };
  });

  return { generatedAt, totals, items: statusItems };
}
