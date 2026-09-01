export function opportunitySource(item) {
  return {
    id: item.id,
    sourceId: item.sourceId,
    repository: item.repository,
    repositoryUrl: item.repositoryUrl,
    url: item.url,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    community: item.community,
  };
}
