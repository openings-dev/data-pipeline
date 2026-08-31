import { buildExcerpt } from "../../shared/utils/text.mjs";
import { parseSponsoredIssueMetadata } from "./sponsored-issue-form.mjs";

const OPERATIONAL_LABELS = new Set(["ad-request", "sponsored"]);

function uniqueSponsoredTags(tags, metadata) {
  const values = [
    ...tags.filter((tag) => !OPERATIONAL_LABELS.has(tag.toLowerCase())),
    metadata.workModel,
    metadata.seniority,
    ...metadata.stack,
  ].filter(Boolean);
  const seen = new Set();

  return values.filter((value) => {
    const key = value.toLocaleLowerCase("en");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function sponsoredDescription(metadata) {
  return [
    ["Location details", metadata.locationDetails],
    ["Work model", metadata.workModel],
    ["Seniority", metadata.seniority],
    ["Stack", metadata.stack.join(", ")],
    ["Salary or compensation", metadata.salary],
    ["Job description", metadata.description],
    ["How to apply", metadata.application],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([heading, value]) => `### ${heading}\n\n${value}`)
    .join("\n\n");
}

/**
 * @param {Record<string, any>} opportunity
 * @param {{body?: string | null}} issue
 */
export function applySponsoredIssueMetadata(opportunity, issue) {
  const metadata = parseSponsoredIssueMetadata(issue.body);
  const description = sponsoredDescription(metadata) || opportunity.description;
  const title = metadata.title ?? opportunity.title;

  return {
    ...opportunity,
    title,
    description,
    excerpt: buildExcerpt(title, description),
    country: metadata.country ?? opportunity.country,
    region: metadata.region ?? opportunity.region,
    tags: uniqueSponsoredTags(opportunity.tags, metadata),
    companyName: metadata.companyName ?? opportunity.companyName,
  };
}
