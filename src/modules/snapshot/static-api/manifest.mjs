import { sha256Json } from "../../../shared/utils/hash.mjs";
import { STATIC_API_PAGE_SIZE } from "./pages.mjs";
import {
  staticApiCommunitiesPath,
  staticApiFacetIndexPath,
  staticApiJobIdsPath,
  staticApiOrderPath,
  staticApiPageLookupPath,
  staticApiSearchIndexPath,
  staticApiAliasesPath,
  staticApiStatusHistoryPath,
  staticApiStatusPath,
} from "./paths.mjs";

export function buildStaticApiManifest(params) {
  const {
    generatedAt,
    items,
    pages,
    facetSummary,
    facetIndex,
    communities,
    aliases,
    status,
    statusHistory,
  } = params;
  const jobIds = items.map((item) => item.id);

  return {
    generatedAt,
    schemaVersion: 6,
    pageSize: STATIC_API_PAGE_SIZE,
    dataHash: sha256Json({
      jobIds,
      facetSummary,
      communities: communities.items,
      aliases: aliases.ids,
      status: status.items,
      statusHistory: statusHistory.runs,
    }),
    totals: {
      openOpportunities: items.length,
      pages: pages.length,
      repositories: Object.keys(facetIndex.dimensions.repositories).length,
      communities: communities.items.length,
      countries: Object.keys(facetIndex.dimensions.countries).length,
      regions: Object.keys(facetIndex.dimensions.regions).length,
    },
    files: {
      facets: staticApiFacetIndexPath(),
      pageLookup: staticApiPageLookupPath(),
      search: staticApiSearchIndexPath(),
      jobIds: staticApiJobIdsPath(),
      order: staticApiOrderPath(),
      communities: staticApiCommunitiesPath(),
      aliases: staticApiAliasesPath(),
      status: staticApiStatusPath(),
      statusHistory: staticApiStatusHistoryPath(),
    },
    facets: facetSummary,
    pages: pages.map((page) => ({
      page: page.page,
      file: page.file,
      count: page.payload.items.length,
    })),
  };
}
