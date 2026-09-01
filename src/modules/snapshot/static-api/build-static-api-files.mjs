import { sortOpportunitiesByDate } from "../../opportunities/opportunity-mapper.mjs";
import { buildFacetIndex, buildFacetSummary } from "./facet-index.mjs";
import { buildJobBuckets } from "./jobs.mjs";
import { withPublicOpportunityId } from "./opportunity-id.mjs";
import { buildItemPages, buildPageLookup } from "./pages.mjs";
import { staticApiAliasesPath, staticApiCommunitiesPath, staticApiFacetIndexPath, staticApiJobIdsPath, staticApiManifestPath, staticApiOrderPath, staticApiPageLookupPath, staticApiSearchIndexPath, staticApiStatusHistoryPath, staticApiStatusPath, toFile } from "./paths.mjs";
import { buildSearchIndex } from "./search-text.mjs";
import { buildCommunities } from "./communities.mjs";
import { deduplicateOpportunities } from "../../opportunities/deduplicate-opportunities.mjs";
import { classifyFreshness } from "../../opportunities/opportunity-freshness.mjs";
import { buildStaticApiManifest } from "./manifest.mjs";
import { buildOpportunityAliases } from "./aliases.mjs";
import { buildCommunityStatus } from "./community-status.mjs";
import { buildStatusHistory } from "./status-history.mjs";
import { normalizeDiscoveryOpportunity } from "../../opportunities/normalize-discovery-opportunity.mjs";
import {
  collectRepositoryItems,
  collectSynchronizedRepositories,
} from "./repository-items.mjs";
function normalizeOpenItems(countrySnapshots, generatedAt) {
  const itemsById = new Map();
  for (const item of collectRepositoryItems(countrySnapshots)) {
    const normalized = normalizeDiscoveryOpportunity(withPublicOpportunityId(item));
    if (normalized.issueState !== "open") continue;
    itemsById.set(normalized.id, normalized);
  }
  return sortOpportunitiesByDate(
    deduplicateOpportunities([...itemsById.values()]).map((item) => ({
      ...item,
      freshness: classifyFreshness(item.createdAt, generatedAt),
    })),
  );
}
export function buildStaticApiFiles(params) {
  const {
    snapshotRootDir,
    generatedAt,
    countrySnapshots,
    repositories,
    failedRepositories = [],
    previousStatus = null,
    previousStatusHistory = null,
    startedAt = generatedAt,
  } = params;
  const items = normalizeOpenItems(countrySnapshots, generatedAt);
  const communities = buildCommunities(repositories, items);
  const synchronizedRepositories = collectSynchronizedRepositories(countrySnapshots);
  const status = buildCommunityStatus({
    generatedAt,
    repositories,
    items,
    failedRepositories,
    previousStatus,
    synchronizedRepositories,
  });
  const statusHistory = buildStatusHistory({
    startedAt,
    completedAt: generatedAt,
    repositories,
    synchronizedRepositories,
    failedRepositories,
    status,
    openOpportunities: items.length,
    previousHistory: previousStatusHistory,
  });
  const aliases = buildOpportunityAliases(items);
  const pages = buildItemPages(items, generatedAt);
  const pageLookup = buildPageLookup(pages);
  const facetIndex = buildFacetIndex(items);
  const facetSummary = buildFacetSummary(facetIndex);
  const files = pages.map((page) =>
    toFile(snapshotRootDir, page.file, page.payload),
  );
  files.push(toFile(snapshotRootDir, staticApiPageLookupPath(), { generatedAt, pageLookup }));
  files.push(toFile(snapshotRootDir, staticApiFacetIndexPath(), { generatedAt, ...facetIndex }));
  files.push(toFile(snapshotRootDir, staticApiSearchIndexPath(), {
    generatedAt, items: buildSearchIndex(items),
  }));
  files.push(toFile(snapshotRootDir, staticApiJobIdsPath(), {
    generatedAt, ids: items.map((item) => item.id),
  }));
  files.push(toFile(snapshotRootDir, staticApiOrderPath(), {
    generatedAt, ids: items.map((item) => item.id),
  }));
  files.push(toFile(snapshotRootDir, staticApiAliasesPath(), { generatedAt, ...aliases }));
  files.push(toFile(snapshotRootDir, staticApiCommunitiesPath(), { generatedAt, ...communities }));
  files.push(toFile(snapshotRootDir, staticApiStatusPath(), status));
  files.push(toFile(snapshotRootDir, staticApiStatusHistoryPath(), statusHistory));
  files.push(...buildJobBuckets(items, generatedAt).map((bucket) =>
    toFile(snapshotRootDir, bucket.file, bucket.payload),
  ));
  const manifest = buildStaticApiManifest({ generatedAt, items, pages, facetSummary,
    facetIndex, communities, aliases, status, statusHistory });
  files.push(toFile(snapshotRootDir, staticApiManifestPath(), manifest));
  return files;
}
