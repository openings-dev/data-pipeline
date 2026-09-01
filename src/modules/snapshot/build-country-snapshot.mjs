import { sha256Json } from "../../shared/utils/hash.mjs";
import { sortOpportunitiesByDate } from "../opportunities/opportunity-mapper.mjs";
import {
  countryIndexRelativePath,
  repositoryShardRelativePath,
  toSnapshotPath,
} from "./snapshot-paths.mjs";

function summarizeTotals(repositories) {
  return repositories.reduce(
    (totals, repository) => ({
      opportunities: totals.opportunities + repository.issues,
      repositories: totals.repositories + 1,
      openIssues: totals.openIssues + repository.openIssues,
      closedIssues: totals.closedIssues + repository.closedIssues,
    }),
    { opportunities: 0, repositories: 0, openIssues: 0, closedIssues: 0 },
  );
}

/**
 * @param {{snapshotRootDir: string; generatedAt: string; countryResult: {country: string; countryCode: string; region: string; repositories: Array<any>; failedRepositories: Array<any>;}}} params
 */
export function buildCountrySnapshot(params) {
  const { snapshotRootDir, generatedAt, countryResult } = params;
  const repositoryShards = countryResult.repositories
    .sort((left, right) => left.repository.localeCompare(right.repository))
    .map((repository) => {
      const relativePath = repositoryShardRelativePath(
        countryResult.countryCode,
        repository.repository,
      );
      const items = sortOpportunitiesByDate(repository.items);
      const dataHash = sha256Json(items);

      return {
        relativePath,
        filePath: toSnapshotPath(snapshotRootDir, relativePath),
        hash: dataHash,
        payload: {
          generatedAt,
          country: countryResult.country,
          countryCode: countryResult.countryCode,
          region: countryResult.region,
          repository: repository.repository,
          totals: {
            opportunities: repository.issues,
            openIssues: repository.openIssues,
            closedIssues: repository.closedIssues,
          },
          dataHash,
          items,
        },
      };
    });

  const totals = summarizeTotals(countryResult.repositories);
  const indexRelativePath = countryIndexRelativePath(countryResult.countryCode);

  return {
    countryCode: countryResult.countryCode,
    country: countryResult.country,
    region: countryResult.region,
    totals,
    index: {
      relativePath: indexRelativePath,
      filePath: toSnapshotPath(snapshotRootDir, indexRelativePath),
      payload: {
        generatedAt,
        country: countryResult.country,
        countryCode: countryResult.countryCode,
        region: countryResult.region,
        totals,
        failedRepositories: countryResult.failedRepositories,
        byRepository: repositoryShards.map((shard) => ({
          repository: shard.payload.repository,
          issues: shard.payload.totals.opportunities,
          openIssues: shard.payload.totals.openIssues,
          closedIssues: shard.payload.totals.closedIssues,
          file: shard.relativePath,
          hash: shard.hash,
        })),
      },
    },
    repositoryShards,
  };
}
