import { mapIssueToOpportunity, sortOpportunitiesByDate } from "../opportunities/opportunity-mapper.mjs";

/**
 * @param {{repository: Record<string, any>; githubClient: ReturnType<import("../github/github-client.mjs").createGitHubClient>}} params
 */
export async function processRepository(params) {
  const { repository, githubClient } = params;
  const issues = await githubClient.fetchRecentIssues(repository.repository);
  const items = sortOpportunitiesByDate(
    issues.map((issue) => mapIssueToOpportunity(issue, repository)),
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
