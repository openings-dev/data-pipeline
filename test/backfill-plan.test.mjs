import assert from "node:assert/strict";
import test from "node:test";
import { buildPublishingBackfill, selectPublishingBackfillBatch } from "../src/modules/publishing/backfill-plan.mjs";

const job = { id: "gh_1", title: "Engineer", excerpt: "Build", contentHash: "a".repeat(64) };
const author = { author: { handle: "alice", name: "Alice" }, opportunityIds: ["gh_1"] };
const community = { repository: "acme/jobs", name: "Acme Jobs" };

test("plans one deterministic R2 publication per job, author, and community", () => {
  const result = buildPublishingBackfill({ jobs: [job], authors: [author, author], communities: [community, community] });
  assert.equal(result.publications.length, 3);
  assert.deepEqual(result.publications.map((item) => item.identity.sourceType), ["author", "community", "job"]);
  assert.equal(result.publications.every((item) => item.deliveries.length === 1 && item.deliveries[0].adapter === "web.r2"), true);
  assert.deepEqual(result.estimate, {
    publications: 3,
    queueOperations: 9,
    d1RowsRead: 9_000,
    d1RowsWritten: 195,
    r2Bytes: result.estimate.r2Bytes,
  });
});

test("fails closed before exceeding the internal free-tier publication ceiling", () => {
  const jobs = Array.from({ length: 1_334 }, (_, index) => ({ ...job, id: `gh_${index}`, contentHash: String(index).padStart(64, "0") }));
  assert.throws(() => buildPublishingBackfill({ jobs, authors: [], communities: [] }), /free queue-operation budget/u);
});

test("selects a deterministic bounded batch and recalculates its capacity estimate", () => {
  const plan = buildPublishingBackfill({ jobs: [
    job,
    { ...job, id: "gh_2", contentHash: "b".repeat(64) },
    { ...job, id: "gh_3", contentHash: "c".repeat(64) },
  ], authors: [], communities: [] });
  const batch = selectPublishingBackfillBatch(plan.publications, { offset: 1, limit: 1 });
  assert.equal(batch.publications.length, 1);
  assert.equal(batch.publications[0].identity.sourceId, "gh_2");
  assert.deepEqual(batch.estimate, {
    publications: 1, queueOperations: 3, d1RowsRead: 3_000, d1RowsWritten: 65,
    r2Bytes: batch.estimate.r2Bytes,
  });
});
