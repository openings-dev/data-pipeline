import { execFileSync } from "node:child_process";
import { assertBackfillCapacity } from "../src/modules/publishing/backfill-capacity.mjs";

const estimate = JSON.parse(execFileSync(process.execPath, ["scripts/plan-publishing-backfill.mjs"], { encoding: "utf8" }));
const endpoint = required("PUBLISHING_SHADOW_ENDPOINT").replace(/\/+$/u, "");
const response = await fetch(`${endpoint}/admin/capacity`, { headers: { authorization: `Bearer ${required("PUBLISHING_ADMIN_TOKEN")}` } });
if (!response.ok) throw new Error(`Capacity endpoint returned HTTP ${response.status}.`);
assertBackfillCapacity(await response.json(), estimate);
process.stdout.write("Backfill capacity is safely below 40% of every free allowance.\n");

function required(name) { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; }
