import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPublishingBackfill } from "../src/modules/publishing/backfill-plan.mjs";
import { dispatchBackfill } from "../src/modules/publishing/dispatch-backfill.mjs";
import { createPublishingSender } from "../src/modules/publishing/publishing-client.mjs";

if (process.env.CONFIRM_BACKFILL !== "BACKFILL OPENINGS WEB ENTITIES") throw new Error("Exact backfill confirmation is required.");
const apiRoot = resolve("snapshots/opportunities/api");
const [jobFiles, authorFiles, communities] = await Promise.all([
  readdir(resolve(apiRoot, "jobs")), readdir(resolve(apiRoot, "authors")), readJson(resolve(apiRoot, "communities.json")),
]);
const jobs = (await Promise.all(jobFiles.filter(json).map(async (file) => Object.values((await readJson(resolve(apiRoot, "jobs", file))).items ?? {})))).flat();
const authors = await Promise.all(authorFiles.filter(json).map((file) => readJson(resolve(apiRoot, "authors", file))));
const plan = buildPublishingBackfill({ jobs, authors, communities: communities.items ?? [] });
const send = createPublishingSender({ endpoint: required("PUBLISHING_SHADOW_ENDPOINT"),
  clientId: required("PUBLISHING_CLIENT_ID"), secret: required("PUBLISHING_CLIENT_SECRET") });
const result = await dispatchBackfill(plan.publications, send, 4);
process.stdout.write(`${JSON.stringify({ ...plan.estimate, accepted: result.accepted, failures: result.failures.length })}\n`);
if (result.failures.length) throw new Error(`Backfill retained ${result.failures.length} publications.`);

function required(name) { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; }
function json(file) { return file.endsWith(".json"); }
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
