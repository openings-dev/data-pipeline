import { toSnapshotPath } from "./snapshot-paths.mjs";
import { buildCountrySnapshot } from "./build-country-snapshot.mjs";
import { buildGlobalIndex } from "./build-global-index.mjs";
import { buildStaticApiFiles } from "./static-api/build-static-api-files.mjs";

/**
 * @param {{snapshotRootDir: string; generatedAt: string; startedAt?: string; catalogGeneratedAt: string | null; request: Record<string, unknown>; repositoriesRequested: number; repositoriesScanned: number; failedRepositories: Array<Record<string, unknown>>; countries: Array<any>; catalogRepositories: Array<any>; previousStatus?: Record<string, unknown> | null; previousStatusHistory?: Record<string, unknown> | null;}} params
 */
export function prepareSegmentedSnapshot(params) {
  const {
    snapshotRootDir,
    generatedAt,
    startedAt = generatedAt,
    catalogGeneratedAt,
    request,
    repositoriesRequested,
    repositoriesScanned,
    failedRepositories,
    countries,
    catalogRepositories,
    previousStatus = null,
    previousStatusHistory = null,
  } = params;

  const countrySnapshots = countries
    .map((countryResult) => buildCountrySnapshot({ snapshotRootDir, generatedAt, countryResult }))
    .sort((left, right) => left.countryCode.localeCompare(right.countryCode));
  const staticApiFiles = buildStaticApiFiles({
    snapshotRootDir,
    generatedAt,
    countrySnapshots,
    repositories: catalogRepositories,
    failedRepositories,
    previousStatus,
    previousStatusHistory,
    startedAt,
  });

  const globalIndex = buildGlobalIndex({
    generatedAt,
    catalogGeneratedAt,
    request,
    repositoriesRequested,
    repositoriesScanned,
    failedRepositories,
    countrySnapshots,
    staticApiFiles,
  });

  return {
    snapshotRootDir,
    globalIndex: {
      ...globalIndex,
      filePath: toSnapshotPath(snapshotRootDir, globalIndex.relativePath),
    },
    countrySnapshots,
    staticApiFiles,
  };
}
