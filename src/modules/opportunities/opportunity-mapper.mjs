import { buildDescription, buildExcerpt, normalizeText } from "../../shared/utils/text.mjs";
import { sha256Json } from "../../shared/utils/hash.mjs";
import { parseSalary } from "./salary-parser.mjs";
import { extractTags } from "./tags-extractor.mjs";
import { applySponsoredIssueMetadata } from "./sponsored-issue-metadata.mjs";

/**
 * @param {string | null | undefined} title
 * @param {string | null | undefined} body
 */
function parseCompanyName(title, body) {
  const source = `${title ?? ""}\n${body ?? ""}`;

  const labeledMatch = source.match(
    /(?:company|empresa|companhia|cliente)\s*[:|-]\s*([^\n|]{2,80})/i,
  );

  if (labeledMatch) {
    const normalized = normalizeText(labeledMatch[1]);
    return normalized.length <= 64 ? normalized : undefined;
  }

  const titleAtMatch = String(title ?? "").match(
    /\b(?:at|na|no)\s+([A-Za-z0-9&.'\- ]{2,64})$/i,
  );

  if (titleAtMatch) {
    return normalizeText(titleAtMatch[1]);
  }

  return undefined;
}

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
    tags: extractTags(issue),
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
  const normalized = repository.issueMetadataFormat === "openings-sponsored-job-v1"
    ? applySponsoredIssueMetadata(opportunity, issue)
    : opportunity;

  return repository.promotionType === "sponsored"
    ? { ...normalized, promotion: { type: "sponsored" } }
    : normalized;
}

/**
 * @param {Array<{createdAt: string}>} opportunities
 */
export function sortOpportunitiesByDate(opportunities) {
  return [...opportunities].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
