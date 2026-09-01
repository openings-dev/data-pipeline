export function collectRepositoryItems(countrySnapshots) {
  return countrySnapshots.flatMap((country) =>
    country.repositoryShards.flatMap((shard) => shard.payload.items),
  );
}

export function collectSynchronizedRepositories(countrySnapshots) {
  return countrySnapshots.flatMap((country) =>
    country.repositoryShards.map((shard) => shard.payload.repository),
  );
}
