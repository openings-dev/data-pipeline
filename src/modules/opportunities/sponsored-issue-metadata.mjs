import { buildExcerpt, normalizeText } from "../../shared/utils/text.mjs";

const EMPTY_RESPONSES = new Set(["_No response_", "No response"]);
const OPERATIONAL_LABELS = new Set(["ad-request", "sponsored"]);

function responseValue(value) {
  const normalized = String(value ?? "").trim();
  return !normalized || EMPTY_RESPONSES.has(normalized) ? undefined : normalized;
}

/**
 * @param {string | null | undefined} body
 */
function issueFormSections(body) {
  const sections = new Map();
  const lines = String(body ?? "").replace(/\r\n/g, "\n").split("\n");
  let heading = null;
  let response = [];

  const commit = () => {
    if (!heading) return;
    const value = responseValue(response.join("\n"));
    if (value) sections.set(heading, value);
  };

  for (const line of lines) {
    const match = line.match(/^###\s+(.+?)\s*$/);
    if (match) {
      commit();
      heading = normalizeText(match[1]);
      response = [];
      continue;
    }

    if (heading) response.push(line);
  }
  commit();

  return sections;
}

function splitStack(value) {
  return String(value ?? "")
    .split(/[,;\n]/)
    .map(normalizeText)
    .filter(Boolean);
}

/**
 * @param {string | null | undefined} body
 */
export function parseSponsoredIssueMetadata(body) {
  const sections = issueFormSections(body);

  return {
    title: sections.get("Job title"),
    companyName: sections.get("Company"),
    country: sections.get("Country"),
    region: sections.get("Region"),
    locationDetails: sections.get("Location details"),
    workModel: sections.get("Work model"),
    seniority: sections.get("Seniority"),
    stack: splitStack(sections.get("Stack")),
    salary: sections.get("Salary or compensation"),
    description: sections.get("Job description"),
    application: sections.get("How to apply"),
  };
}

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
