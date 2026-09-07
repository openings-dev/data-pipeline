import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPublishingSender } from "../src/modules/publishing/publishing-client.mjs";
import { runPublishingShadowSmoke } from "../src/modules/publishing/publishing-shadow-smoke.mjs";

const STAGING_ENDPOINT = "https://publishing-platform-staging.business-850.workers.dev";
const endpoint = requiredEnvironment("PUBLISHING_SHADOW_ENDPOINT");
if (endpoint !== STAGING_ENDPOINT) throw new Error("Shadow smoke endpoint must be isolated staging.");

const pagePath = resolve(process.cwd(), "snapshots", "opportunities", "api", "pages", "page-0001.json");
const page = JSON.parse(await readFile(pagePath, "utf8"));
const job = page?.items?.[0];
if (!job) throw new Error("Shadow smoke requires one current opportunity.");

const send = createPublishingSender({
  endpoint,
  clientId: requiredEnvironment("PUBLISHING_CLIENT_ID"),
  secret: requiredEnvironment("PUBLISHING_CLIENT_SECRET"),
});
const result = await runPublishingShadowSmoke({ job, send });
console.log(`publishing-shadow-smoke: accepted=${result.accepted} pending=${result.pending}`);

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
