import assert from "node:assert/strict";
import test from "node:test";
import { buildPublishingBackfill } from "../src/modules/publishing/backfill-plan.mjs";

const job = { id: "gh_1", title: "Engineer", excerpt: "Build", contentHash: "a".repeat(64) };
const author = { author: { handle: "alice", name: "Alice" }, opportunityIds: ["gh_1"] };
const community = { repository: "acme/jobs", name: "Acme Jobs" };

test("plans one deterministic R2 publication per job, author, and community", () => {
  const result = buildPublishingBackfill({ jobs: [job], authors: [author, author], communities: [community, community] });
  assert.equal(result.publications.length, 3);
  assert.deepEqual(result.publications.map((item) => item.identity.sourceType), ["author", "community", "job"]);
  assert.equal(result.publications.every((item) => item.deliveries.length === 1 && item.deliveries[0].adapter === "web.r2"), true);
  assert.deepEqual(result.estimate, { publications: 3, queueOperations: 9, d1Rows: 39, r2Bytes: result.estimate.r2Bytes });
});

test("fails closed before exceeding the internal free-tier publication ceiling", () => {
  const jobs = Array.from({ length: 1_334 }, (_, index) => ({ ...job, id: `gh_${index}`, contentHash: String(index).padStart(64, "0") }));
  assert.throws(() => buildPublishingBackfill({ jobs, authors: [], communities: [] }), /free queue-operation budget/u);
});
