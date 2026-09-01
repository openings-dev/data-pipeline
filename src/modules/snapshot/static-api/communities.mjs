function toTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareCommunities(left, right) {
  if (right.opportunitiesCount !== left.opportunitiesCount) {
    return right.opportunitiesCount - left.opportunitiesCount;
  }

  const leftPostedAt = toTimestamp(left.lastPostedAt);
  const rightPostedAt = toTimestamp(right.lastPostedAt);
  if (leftPostedAt !== rightPostedAt) {
    if (leftPostedAt === null) return 1;
    if (rightPostedAt === null) return -1;
    return rightPostedAt - leftPostedAt;
  }

  return left.repository.localeCompare(right.repository);
}

export function buildCommunities(repositories, opportunityItems) {
  const openItemsByRepository = new Map();

  for (const item of opportunityItems) {
    if (item.issueState !== "open") continue;
    const sources = Array.isArray(item.sources) && item.sources.length > 0
      ? item.sources
      : [item];
    for (const source of sources) {
      const items = openItemsByRepository.get(source.repository) ?? [];
      items.push({ ...item, createdAt: source.createdAt, community: source.community ?? item.community });
      openItemsByRepository.set(source.repository, items);
    }
  }

  const items = repositories.map((source) => {
    const openItems = openItemsByRepository.get(source.repository) ?? [];
    const latestItem = openItems.reduce((latest, item) => {
      const itemTimestamp = toTimestamp(item.createdAt);
      if (itemTimestamp === null) return latest;
      if (!latest || itemTimestamp > latest.timestamp) {
        return { item, timestamp: itemTimestamp };
      }
      return latest;
    }, null);
    const community = latestItem?.item.community;

    return {
      repository: source.repository,
      repositoryUrl: source.url,
      name: community?.name?.trim() || source.owner,
      avatarUrl: community?.avatarUrl?.trim() || `https://github.com/${source.owner}.png`,
      region: source.region,
      country: source.country,
      countryCode: source.countryCode,
      locale: source.locale,
      scope: source.scope,
      opportunitiesCount: openItems.length,
      lastPostedAt: latestItem ? new Date(latestItem.timestamp).toISOString() : null,
    };
  });

  return { items: items.sort(compareCommunities) };
}
