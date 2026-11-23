export const ISSUE_POLICIES = new Set([
  "structured-submissions", "linked-submissions", "company-careers",
]);

const NON_SUBMISSION_LABELS = new Set([
  "misc", "edit_role", "edit_internship", "bug", "question", "enhancement",
]);
const GENERIC_TITLE = /^(?:new (?:internship|role|position|grad)|add internship\s*:.*)$/iu;

function fieldsFromBody(body) {
  const fields = new Map();
  for (const match of body.matchAll(/^#{2,6}\s+([^\n]+)\n+([\s\S]*?)(?=^#{1,6}\s|$(?![\s\S]))/gmu)) {
    fields.set(match[1].trim().toLowerCase(), match[2].trim());
  }
  for (const match of body.matchAll(/^\*\*([^*:\n]+):?\*\*\s*:?\s*(.+)$/gmu)) {
    fields.set(match[1].trim().toLowerCase(), match[2].trim());
  }
  for (const match of body.matchAll(/^(Company|Role|Position|Link):\s*(.+)$/gimu)) {
    fields.set(match[1].toLowerCase(), match[2].trim());
  }
  return fields;
}

function value(fields, names) {
  return names.map((name) => fields.get(name)).find((text) =>
    text && !/^[_*\s]*(?:no response|n\/a|none)[_*\s]*$/iu.test(text)
  );
}

function webLink(text) {
  if (!text) return false;
  const match = text.match(/https?:\/\/[^\s<>]+/u);
  if (!match) return false;
  try { return Boolean(new URL(match[0]).hostname); } catch { return false; }
}

/** Source-specific admission. Ordinary community boards are intentionally unchanged. */
export function admitIssue(issue, repository) {
  if (repository.excludedIssues?.some((entry) => entry.number === issue.number)) return null;
  const policy = repository.issuePolicy;
  if (!policy) return issue;
  if (!ISSUE_POLICIES.has(policy)) throw new Error(`Unknown issue policy: ${policy}`);
  const labels = (issue.labels ?? []).map((label) =>
    String(typeof label === "string" ? label : label?.name ?? "").toLowerCase()
  );
  if (labels.some((label) => NON_SUBMISSION_LABELS.has(label))) return null;
  const body = String(issue.body ?? "");
  const fields = fieldsFromBody(body);
  const company = value(fields, ["company name", "company"]);
  const role = value(fields, ["job title", "internship title", "position title", "role title", "grad title", "position", "role"]);
  const application = value(fields, ["link to job posting", "link to internship posting", "link to grad posting", "position application link", "application link", "link"]);
  let eligible = Boolean(company && role && webLink(application));
  if (policy === "linked-submissions") {
    eligible ||= /^https?:\/\/\S+$/u.test(body.trim())
      && webLink(body)
      && /\b(?:engineer|developer|analyst|intern)\b/iu.test(issue.title ?? "");
  }
  if (policy === "company-careers") {
    eligible = Boolean(company && webLink(value(fields, ["career/job page url"]))
      && value(fields, ["repository description"]));
  }
  if (!eligible) return null;
  if (role && company && GENERIC_TITLE.test(String(issue.title ?? "").trim())
      && !/[\r\n]/u.test(role + company) && role.length <= 160 && company.length <= 100) {
    return { ...issue, title: `${role} — ${company}`, source_title: issue.title };
  }
  return issue;
}
