import { loadBuildConfig } from "../config/env.mjs";
import { selectRepositories } from "../modules/build/select-repositories.mjs";
import { collectCountryResults } from "../modules/build/collect-country-results.mjs";
import { readRepositoryCatalog } from "../modules/catalog/catalog-repository.mjs";
import { createGitHubClient } from "../modules/github/github-client.mjs";
import { createLogger } from "../modules/observability/logger.mjs";
import { prepareSegmentedSnapshot } from "../modules/snapshot/prepare-segmented-snapshot.mjs";
import { writeSegmentedSnapshot } from "../modules/snapshot/write-segmented-snapshot.mjs";
import { readJsonIfExists } from "../modules/storage/read-json-if-exists.mjs";
import { toSnapshotPath } from "../modules/snapshot/snapshot-paths.mjs";
import { loadPublishingState, updatePublishingOutbox } from "../modules/publishing/prepare-outbox.mjs";
import { staticApiStatusHistoryPath, staticApiStatusPath } from "../modules/snapshot/static-api/paths.mjs";

export async function runBuild() {
  const config = loadBuildConfig();
  const logger = createLogger({ component: "snapshot-builder" });
  const catalog = await readRepositoryCatalog(config.paths.repositoriesFile);
  const repositories = selectRepositories({
    repositories: catalog.repositories,
    maxRepositories: config.limits.maxRepositories,
    countryCodes: config.filters.countryCodes,
  });

  if (repositories.length === 0) {
    throw new Error(`No repositories found after filters in ${config.paths.repositoriesFile}.`);
  }
  const startedAt = new Date().toISOString();
  const publishingState = await loadPublishingState(config.paths);
  const [previousStatus, previousStatusHistory] = await Promise.all([
    readJsonIfExists(
      toSnapshotPath(config.paths.snapshotRootDir, staticApiStatusPath()),
    ),
    readJsonIfExists(
      toSnapshotPath(
        config.paths.snapshotRootDir,
        staticApiStatusHistoryPath(),
      ),
    ),
  ]);

  logger.info("build-started", {
    repositories_requested: repositories.length,
    max_issues_per_repository: config.limits.maxIssuesPerRepository,
    request_delay_ms: config.limits.requestDelayMs,
    authenticated_requests: Boolean(config.github.token),
    country_filter: config.filters.countryCodes,
  });

  const githubClient = createGitHubClient({
    token: config.github.token,
    maxIssuesPerRepository: config.limits.maxIssuesPerRepository,
    logger: logger.child({ module: "github" }),
  });

  const results = await collectCountryResults({
    repositories,
    githubClient,
    requestDelayMs: config.limits.requestDelayMs,
    logger,
  });
  if (results.repositoriesScanned === 0 && results.failedRepositories.length > 0) {
    throw new Error("No repositories were processed successfully. Snapshot update aborted.");
  }

  const completedAt = new Date().toISOString();
  const snapshot = prepareSegmentedSnapshot({
    snapshotRootDir: config.paths.snapshotRootDir,
    generatedAt: completedAt,
    startedAt,
    catalogGeneratedAt: catalog.generatedAt ?? null,
    request: {
      maxIssuesPerRepository: config.limits.maxIssuesPerRepository,
      maxRepositories: config.limits.maxRepositories,
      requestDelayMs: config.limits.requestDelayMs,
      usedAuthenticatedRequests: Boolean(config.github.token),
      countryCodes: config.filters.countryCodes,
    },
    repositoriesRequested: repositories.length,
    repositoriesScanned: results.repositoriesScanned,
    failedRepositories: results.failedRepositories,
    countries: results.countries,
    catalogRepositories: catalog.repositories,
    previousStatus,
    previousStatusHistory,
  });

  const writeResult = await writeSegmentedSnapshot(snapshot);
  const publishing = await updatePublishingOutbox(publishingState, snapshot);
  logger.info(writeResult.updated ? "build-updated" : "build-no-changes", {
    repositories_scanned: results.repositoriesScanned,
    failed_repositories: results.failedRepositories.length,
    changed_files: writeResult.changedFiles.length,
  });

  return { updated: writeResult.updated, snapshot: snapshot.globalIndex.payload, publishing };
}
