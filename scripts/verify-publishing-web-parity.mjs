import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPublishingBackfill } from "../src/modules/publishing/backfill-plan.mjs";
import { verifyWebPublication } from "../src/modules/publishing/web-parity.mjs";

const baseUrl = (process.env.PUBLISHING_WEB_BASE_URL || "https://cloudflare-preview.openings-dev-web.pages.dev").replace(/\/+$/u, "");
const plan = await loadPlan();
const failures = [];
const concurrency = 5;
let cursor = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor < plan.publications.length) {
    const publication = plan.publications[cursor++];
    const route = publication.deliveries[0].payload.entity.canonicalPath;
    try {
      const response = await fetch(`${baseUrl}${route}`, { headers: { "cache-control": "no-cache" } });
      const issues = await verifyWebPublication(response, publication);
      if (issues.length > 0) failures.push({ route, issues });
    } catch (error) {
      failures.push({ route, issues: [error instanceof Error ? error.message : String(error)] });
    }
  }
}));

process.stdout.write(`${JSON.stringify({
  checked: plan.publications.length,
  passed: plan.publications.length - failures.length,
  failed: failures.length,
  failureSamples: failures.slice(0, 25),
}, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;

async function loadPlan() {
  const apiRoot = resolve("snapshots/opportunities/api");
  const [jobFiles, authorFiles, communityDocument] = await Promise.all([
    readdir(resolve(apiRoot, "jobs")), readdir(resolve(apiRoot, "authors")), readJson(resolve(apiRoot, "communities.json")),
  ]);
  const jobs = (await Promise.all(jobFiles.filter(json).map(async (file) => Object.values((await readJson(resolve(apiRoot, "jobs", file))).items ?? {})))).flat();
  const authors = await Promise.all(authorFiles.filter(json).map((file) => readJson(resolve(apiRoot, "authors", file))));
  return buildPublishingBackfill({ jobs, authors, communities: communityDocument.items ?? [] });
}

function json(file) { return file.endsWith(".json"); }
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
