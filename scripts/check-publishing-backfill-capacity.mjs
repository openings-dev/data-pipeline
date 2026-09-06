import { execFileSync } from "node:child_process";
import { assertBackfillCapacity } from "../src/modules/publishing/backfill-capacity.mjs";
import { loadD1AccountUsage } from "../src/modules/publishing/cloudflare-account-usage.mjs";

const estimate = JSON.parse(execFileSync(process.execPath, ["scripts/plan-publishing-backfill.mjs"], { encoding: "utf8" }));
const endpoint = required("PUBLISHING_SHADOW_ENDPOINT").replace(/\/+$/u, "");
const adminToken = required("PUBLISHING_ADMIN_TOKEN");
const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const analyticsToken = required("CLOUDFLARE_ANALYTICS_TOKEN");
const response = await fetch(`${endpoint}/admin/capacity`, { headers: { authorization: `Bearer ${adminToken}` } });
if (!response.ok) throw new Error(`Capacity endpoint returned HTTP ${response.status}.`);
const [internalCapacity, d1AccountUsage] = await Promise.all([
  response.json(),
  loadD1AccountUsage({ accountId, apiToken: analyticsToken }),
]);
assertBackfillCapacity([
  ...internalCapacity.filter((row) => row.resource !== "d1Rows"),
  ...d1AccountUsage,
], estimate);
process.stdout.write("Backfill capacity is safely below 40% of every free allowance.\n");

function required(name) { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; }
