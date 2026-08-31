import { mapIssueToOpportunity } from "../opportunities/opportunity-mapper.mjs";
import { sortOpportunitiesByDate } from "../opportunities/opportunity-sorting.mjs";

/**
 * @param {unknown} labels
 */
function issueLabelNames(labels) {
  if (!Array.isArray(labels)) return new Set();

  return new Set(
    labels
      .map((label) => typeof label === "string" ? label : label?.name)
      .filter((label) => typeof label === "string" && label.trim().length > 0)
      .map((label) => label.trim()),
  );
}

/**
 * @param {Record<string, any>} issue
 * @param {string[]} requiredLabels
 */
function hasEveryRequiredLabel(issue, requiredLabels) {
  if (requiredLabels.length === 0) return true;
  const labels = issueLabelNames(issue.labels);
  return requiredLabels.every((label) => labels.has(label));
}

/**
 * @param {{repository: Record<string, any>; githubClient: ReturnType<import("../github/github-client.mjs").createGitHubClient>}} params
 */
export async function processRepository(params) {
  const { repository, githubClient } = params;
  const requiredLabels = repository.requiredLabels ?? [];
  const issues = await githubClient.fetchRecentIssues(
    repository.repository,
    requiredLabels,
  );
  const items = sortOpportunitiesByDate(
    issues
      .filter((issue) => hasEveryRequiredLabel(issue, requiredLabels))
      .map((issue) => mapIssueToOpportunity(issue, repository)),
  );

  const openIssues = items.filter((item) => item.issueState === "open").length;
  const closedIssues = items.length - openIssues;

  return {
    repository: repository.repository,
    country: repository.country,
    countryCode: repository.countryCode,
    region: repository.region,
    items,
    issues: items.length,
    openIssues,
    closedIssues,
  };
}
