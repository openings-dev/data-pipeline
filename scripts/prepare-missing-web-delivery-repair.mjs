import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPublishingBackfill } from "../src/modules/publishing/backfill-plan.mjs";
import { buildMissingWebDeliveryRepairSql } from "../src/modules/publishing/missing-web-delivery-repair.mjs";

if (process.env.CONFIRM_WEB_DELIVERY_REPAIR !== "REPAIR MISSING OPENINGS WEB DELIVERIES") {
  throw new Error("Exact web delivery repair confirmation is required.");
}
const outputPath = required("WEB_DELIVERY_REPAIR_OUTPUT");
const publicationIds = JSON.parse(required("WEB_DELIVERY_REPAIR_PUBLICATIONS"));
const plan = await loadPlan();
const bySourceId = new Map(plan.publications.map((publication) => [publication.identity.sourceId, publication]));
const repairs = Object.entries(publicationIds).map(([sourceId, publicationId]) => {
  const publication = bySourceId.get(sourceId);
  if (!publication) throw new Error(`No planned publication found for ${sourceId}.`);
  return { publicationId, publication };
});
await writeFile(outputPath, buildMissingWebDeliveryRepairSql(repairs), { encoding: "utf8", flag: "wx" });
process.stdout.write(`${JSON.stringify({ outputPath, repairs: repairs.length })}\n`);

async function loadPlan() {
  const apiRoot = resolve("snapshots/opportunities/api");
  const [jobFiles, authorFiles, communities] = await Promise.all([
    readdir(resolve(apiRoot, "jobs")), readdir(resolve(apiRoot, "authors")), readJson(resolve(apiRoot, "communities.json")),
  ]);
  const jobs = (await Promise.all(jobFiles.filter(json).map(async (file) =>
    Object.values((await readJson(resolve(apiRoot, "jobs", file))).items ?? {})))).flat();
  const authors = await Promise.all(authorFiles.filter(json).map((file) => readJson(resolve(apiRoot, "authors", file))));
  return buildPublishingBackfill({ jobs, authors, communities: communities.items ?? [] });
}

function required(name) { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; }
function json(file) { return file.endsWith(".json"); }
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
