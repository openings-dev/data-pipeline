import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPublishingBackfill, selectPublishingBackfillBatch } from "../src/modules/publishing/backfill-plan.mjs";

const apiRoot = resolve("snapshots/opportunities/api");
const [jobFiles, authorFiles, communityDocument] = await Promise.all([
  readdir(resolve(apiRoot, "jobs")),
  readdir(resolve(apiRoot, "authors")),
  readJson(resolve(apiRoot, "communities.json")),
]);
const jobs = (await Promise.all(jobFiles.filter(json).map(async (file) => {
  const document = await readJson(resolve(apiRoot, "jobs", file));
  return Object.values(document.items ?? {});
}))).flat();
const authors = await Promise.all(authorFiles.filter(json).map((file) => readJson(resolve(apiRoot, "authors", file))));
const plan = buildPublishingBackfill({ jobs, authors, communities: communityDocument.items ?? [] });
const batch = selectPublishingBackfillBatch(plan.publications, batchOptions());
process.stdout.write(`${JSON.stringify({ ...batch.estimate, totalPublications: plan.publications.length }, null, 2)}\n`);

function json(file) { return file.endsWith(".json"); }
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
function batchOptions() { return { offset: integer("BACKFILL_OFFSET", 0), limit: integer("BACKFILL_LIMIT", 500) }; }
function integer(name, fallback) {
  const value = process.env[name] ?? String(fallback);
  if (!/^\d+$/u.test(value)) throw new Error(`${name} must be a non-negative integer.`);
  return Number(value);
}
