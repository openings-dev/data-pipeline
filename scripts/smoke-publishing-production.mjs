import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPublishingSender } from "../src/modules/publishing/publishing-client.mjs";
import { runPublishingShadowSmoke } from "../src/modules/publishing/publishing-shadow-smoke.mjs";
import { loadProductionPublishingConfig } from "../src/modules/publishing/production-config.mjs";

const pagePath = resolve(process.cwd(), "snapshots", "opportunities", "api", "pages", "page-0001.json");
const page = JSON.parse(await readFile(pagePath, "utf8"));
const job = page?.items?.[0];
if (!job) throw new Error("Production smoke requires one current opportunity.");

const send = createPublishingSender(loadProductionPublishingConfig());
const result = await runPublishingShadowSmoke({ job, send });
console.log(`publishing-production-smoke: accepted=${result.accepted} pending=${result.pending}`);
