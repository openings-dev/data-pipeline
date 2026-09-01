import { sha256Json } from "../../shared/utils/hash.mjs";

const GENERIC_TITLES = new Set([
  "editing internship", "new grad", "new internship", "new position", "new role",
]);
const GENERIC_APPLICATION_PATHS = new Set([
  "", "/", "/apply", "/career", "/careers", "/job", "/jobs", "/openings",
  "/opportunities", "/trabalhe-conosco", "/vaga", "/vagas", "/vacancies",
]);
const CONTENT_PATH_SEGMENTS = new Set([
  "about", "benefits", "blog", "contact", "culture", "events", "faq", "faqs",
  "insights", "life", "locations", "news", "offices", "press", "privacy",
  "resources", "stories", "story", "team", "teams", "terms", "values",
]);

function normalized(value) {
  return String(value ?? "").toLowerCase().normalize("NFD")
    .replace(/\p{Diacritic}/gu, "").replace(/[^\p{Letter}\p{Number}+#]+/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function normalizeApplicationUrl(value) {
  try {
    const url = new URL(value.replace(/[),.;]+$/, ""));
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "github.com" || hostname.endsWith(".github.com")) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|referrer$|source$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString().replace(/\?$/, "").replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isSpecificApplicationUrl(value) {
  const url = new URL(value);
  const pathname = url.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const pathSegments = pathname.split("/").filter(Boolean);
  if (GENERIC_APPLICATION_PATHS.has(pathname)) return false;
  if (pathSegments.some((segment) => CONTENT_PATH_SEGMENTS.has(segment))) return false;
  if ([...url.searchParams.keys()].some((key) =>
    /^(?:gh_jid|job|jobid|job_id|position|positionid|requisition|vacancy)$/i.test(key)
  )) return true;
  if (/(?:ashbyhq|greenhouse|gupy|lever|smartrecruiters|workable|workdayjobs)\./i
    .test(hostname)) return pathSegments.length > 0;
  if (/(^|\.)(?:apply|boards|careers|jobs)\./i.test(hostname)) {
    return pathSegments.length > 0;
  }
  if (/\/(?:apply|careers?|jobs?|openings?|opportunities|positions?|requisitions?|vagas?|vacancies)\/[^/]+/i
    .test(pathname)) return true;
  return false;
}

function applicationUrlKey(item) {
  const urls = String(item.description ?? "").match(/https?:\/\/[^\s<>\]]+/g) ?? [];
  const repositoryUrl = normalizeApplicationUrl(item.repositoryUrl);
  const sourceUrl = normalizeApplicationUrl(item.url);
  const application = urls.map(normalizeApplicationUrl)
    .find((url) => url && url !== repositoryUrl && url !== sourceUrl && isSpecificApplicationUrl(url));
  return application ? `application:${application}` : null;
}

function titleCompanyLocationKey(item) {
  const title = normalized(item.title);
  const company = normalized(item.companyName);
  const location = normalized(item.jobLocation?.displayText ?? [
    item.jobLocation?.city, item.jobLocation?.subdivision, item.jobLocation?.country,
  ].filter(Boolean).join(" "));
  if (!title || GENERIC_TITLES.has(title) || !company || !location) return null;
  return `identity:${title}:${company}:${location}`;
}

function titleDescriptionKey(item) {
  const title = normalized(item.title);
  const description = normalized(item.description);
  if (!title || GENERIC_TITLES.has(title) || description.length < 20) return null;
  return `content:${title}:${sha256Json(description)}`;
}

export function duplicateKeys(item) {
  return [applicationUrlKey(item), titleCompanyLocationKey(item), titleDescriptionKey(item)]
    .filter(Boolean);
}
