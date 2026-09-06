import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPublishingBackfill } from "../src/modules/publishing/backfill-plan.mjs";
import {
  createWebParityRequest,
  selectWebParityBatch,
  verifyWebPublicationWithRetry,
} from "../src/modules/publishing/web-parity.mjs";

const baseUrl = (process.env.PUBLISHING_WEB_BASE_URL || "https://cloudflare-preview.openings-dev-web.pages.dev").replace(/\/+$/u, "");
const completePlan = await loadPlan();
const requestTimeoutMs = integer("PARITY_REQUEST_TIMEOUT_MS", 10_000);
const batch = selectWebParityBatch(completePlan.publications, {
  offset: integer("PARITY_OFFSET", 0),
  limit: integer("PARITY_LIMIT", 500),
});
const failures = [];
// Keep the sustained preview load below the free Pages-to-Worker proxy's
// transient fallback threshold while still validating every public route.
const concurrency = 1;
let cursor = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor < batch.publications.length) {
    const publication = batch.publications[cursor++];
    const route = publication.deliveries[0].payload.entity.canonicalPath;
    const request = createWebParityRequest(`${baseUrl}${route}`, requestTimeoutMs);
    const issues = await verifyWebPublicationWithRetry(
      () => fetch(request.url, request.init),
      publication,
      { maximumAttempts: 1 },
    );
    if (issues.length > 0) failures.push({ route, issues });
  }
}));

process.stdout.write(`${JSON.stringify({
  checked: batch.publications.length,
  passed: batch.publications.length - failures.length,
  failed: failures.length,
  offset: batch.offset,
  nextOffset: batch.nextOffset,
  total: batch.total,
  complete: batch.complete,
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
function integer(name, fallback) {
  const value = process.env[name] ?? String(fallback);
  if (!/^\d+$/u.test(value)) throw new Error(`${name} must be a non-negative integer.`);
  return Number(value);
}
