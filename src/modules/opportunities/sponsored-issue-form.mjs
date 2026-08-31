import { normalizeText } from "../../shared/utils/text.mjs";

const EMPTY_RESPONSES = new Set(["_No response_", "No response"]);

function responseValue(value) {
  const normalized = String(value ?? "").trim();
  return !normalized || EMPTY_RESPONSES.has(normalized) ? undefined : normalized;
}

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
