import { documentedSources } from "../catalog/source-rights.mjs";
import {
  candidateMap,
  toCatalogEntry,
  toDecision,
  validateApproval,
} from "./community-review-helpers.mjs";

function normalized(value) {
  return value.toLowerCase();
}

function sortedByRepository(items) {
  return [...items].sort((left, right) => (
    normalized(left.repository).localeCompare(normalized(right.repository))
  ));
}

function decisionCounts(reviews) {
  return reviews.reduce((counts, item) => {
    counts[item.decision] += 1;
    return counts;
  }, { approved: 0, rejected: 0, snoozed: 0 });
}

export function applyCommunityReviews(options) {
  const { report, reviews, catalog, decisions, apply = false } = options;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const candidates = candidateMap(report);
  const catalogKeys = new Set(catalog.repositories.map((item) => normalized(item.repository)));
  const nextCatalog = [...catalog.repositories];
  const nextDecisions = new Map(
    decisions.decisions.map((item) => [normalized(item.repository), item]),
  );
  const addedRepositories = [];

  for (const review of reviews.decisions) {
    const key = normalized(review.repository);
    const candidate = candidates.get(key);
    if (!candidate) throw new Error(`Review is absent from report: ${review.repository}`);
    if (review.decision === "approved") {
      if (catalog.contentRightsPolicy === "documented-reuse" && documentedSources([candidate]).length === 0) {
        throw new Error(`Documented reuse evidence required: ${review.repository}`);
      }
      validateApproval(review, candidate);
      if (catalogKeys.has(key)) {
        if (nextDecisions.get(key)?.decision !== "approved") {
          throw new Error(`Catalog repository already exists: ${review.repository}`);
        }
      } else {
        nextCatalog.push(toCatalogEntry(review, candidate));
        catalogKeys.add(key);
        addedRepositories.push(candidate.repository);
      }
    }
    nextDecisions.set(key, toDecision(review, today));
  }

  const catalogChanged = addedRepositories.length > 0;
  const catalogResult = {
    ...catalog,
    ...(apply && catalogChanged ? { generatedAt: today } : {}),
    repositories: sortedByRepository(nextCatalog),
  };
  const decisionResult = {
    ...decisions,
    decisions: sortedByRepository([...nextDecisions.values()]),
  };
  return {
    apply,
    counts: { ...decisionCounts(reviews.decisions), catalogAdded: addedRepositories.length },
    addedRepositories: addedRepositories.sort((a, b) => normalized(a).localeCompare(normalized(b))),
    catalog: catalogResult,
    decisions: decisionResult,
  };
}
