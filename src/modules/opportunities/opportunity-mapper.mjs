import { buildDescription, buildExcerpt } from "../../shared/utils/text.mjs";
import { sha256Json } from "../../shared/utils/hash.mjs";
import { parseSalary } from "./salary-parser.mjs";
import { extractTags } from "./tags-extractor.mjs";
import { extractJobLocation } from "./job-location.mjs";
import { extractStructuredTaxonomy } from "./structured-taxonomy.mjs";
import { parseCompanyName } from "./company-name.mjs";
import { addIssueDataProvenance } from "./data-provenance.mjs";
/**
 * @param {{id: number; number: number; title?: string; body?: string | null; state?: string; html_url?: string; created_at?: string; updated_at?: string; user?: { login?: string; avatar_url?: string }}} issue
 * @param {{repository: string; owner?: string; url: string; region: string; country: string; countryCode?: string}} repository
 */
export function mapIssueToOpportunity(issue, repository) {
  const body = issue.body ?? "";
  const description = buildDescription(body);
  const combinedText = `${issue.title ?? ""}\n${body}`;
  const owner = repository.owner || repository.repository.split("/")[0] || "unknown";
  const sourceId = `${repository.repository}#${issue.number}`;
  const publicId = `gh_${sha256Json({
    source: "github-issue",
    repository: repository.repository,
    number: issue.number,
  }).slice(0, 24)}`;
  const contentHash = sha256Json({
    title: issue.title ?? "",
    body: body ?? "",
  });
  const sourceLocation = {
    country: repository.country,
    countryCode: repository.countryCode,
    region: repository.region,
  };
  const sourceTags = extractTags(issue);
  const opportunity = {
    id: publicId,
    sourceId,
    title: issue.title ?? "Untitled",
    description,
    excerpt: buildExcerpt(issue.title, issue.body),
    issueState: issue.state === "closed" ? "closed" : "open",
    contentHash,
    repository: repository.repository,
    repositoryUrl: repository.url,
    region: repository.region,
    country: repository.country,
    sourceLocation,
    tags: sourceTags,
    sourceTags,
    author: {
      id: issue.user?.login ?? "unknown",
      name: issue.user?.login ?? "unknown",
      handle: issue.user?.login ?? "unknown",
      avatarUrl: issue.user?.avatar_url ?? "",
    },
    community: {
      id: owner,
      name: owner,
      avatarUrl: `https://github.com/${owner}.png?size=80`,
      repository: repository.repository,
      url: repository.url,
    },
    companyName: parseCompanyName(issue.title, issue.body),
    salary: parseSalary(combinedText, repository),
    createdAt: issue.created_at ?? new Date().toISOString(),
    updatedAt: issue.updated_at ?? issue.created_at ?? new Date().toISOString(),
    url: issue.html_url ?? repository.url,
    sourceType: "github-issue",
  };

  const withLocation = {
    ...opportunity,
    jobLocation: extractJobLocation({
      title: opportunity.title,
      body: opportunity.description,
      sourceLocation,
    }),
    taxonomy: extractStructuredTaxonomy({
      title: opportunity.title,
      body: opportunity.description,
      labels: opportunity.tags,
    }),
  };
  return addIssueDataProvenance(
    withLocation,
    { title: issue.title, body },
  );
}

/**
 * @param {Array<{createdAt: string}>} opportunities
 */
export function sortOpportunitiesByDate(opportunities) {
  return [...opportunities].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
