import { sha256Json } from "../../../shared/utils/hash.mjs";
import { STATIC_API_PAGE_SIZE } from "./pages.mjs";
import {
  staticApiCommunitiesPath,
  staticApiFacetIndexPath,
  staticApiJobIdsPath,
  staticApiOrderPath,
  staticApiPageLookupPath,
  staticApiPromotionsPath,
  staticApiSearchIndexPath,
} from "./paths.mjs";

export function buildStaticApiManifest(params) {
  const { generatedAt, items, pages, facetSummary, facetIndex, communities, promotions } = params;
  const jobIds = items.map((item) => item.id);

  return {
    generatedAt,
    schemaVersion: 5,
    pageSize: STATIC_API_PAGE_SIZE,
    dataHash: sha256Json({
      jobIds,
      promotionIds: promotions.ids,
      facetSummary,
      communities: communities.items,
    }),
    totals: {
      openOpportunities: items.length,
      sponsoredOpportunities: promotions.ids.length,
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
      promotions: staticApiPromotionsPath(),
      communities: staticApiCommunitiesPath(),
    },
    facets: facetSummary,
    pages: pages.map((page) => ({
      page: page.page,
      file: page.file,
      count: page.payload.items.length,
    })),
  };
}
