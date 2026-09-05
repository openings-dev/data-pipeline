import assert from "node:assert/strict";
import test from "node:test";

import { buildNewJobPublications } from "../src/modules/publishing/job-publications.mjs";

const job = {
  id: "gh_123",
  title: "Backend Engineer",
  excerpt: "Build reliable systems",
  contentHash: "a".repeat(64),
  createdAt: "2026-09-04T12:00:00.000Z",
};

test("creates web then all-subscribers push for a genuinely new job", () => {
  const [publication] = buildNewJobPublications({ previousIds: [], jobs: [job] });
  assert.equal(publication.identity.tenant, "openings");
  assert.equal(publication.identity.idempotencyKey, `openings:job:gh_123:${job.contentHash}`);
  assert.deepEqual(publication.deliveries[1].dependsOn, [{ deliveryId: "web", state: "verified" }]);
  assert.equal(publication.deliveries[1].required, true);
  assert.deepEqual(publication.deliveries[1].payload.audience, { type: "all-subscribers" });
  assert.equal(publication.deliveries[1].payload.url, "https://openings.dev/jobs/gh_123");
});

test("does not republish jobs already present in the prior snapshot", () => {
  assert.deepEqual(buildNewJobPublications({ previousIds: [job.id], jobs: [job] }), []);
});

test("sorts deterministic output and rejects incomplete records", () => {
  const second = { ...job, id: "gh_001", contentHash: "b".repeat(64) };
  assert.deepEqual(
    buildNewJobPublications({ previousIds: [], jobs: [job, second] }).map((item) => item.identity.sourceId),
    ["gh_001", "gh_123"],
  );
  assert.throws(() => buildNewJobPublications({ previousIds: [], jobs: [{ ...job, contentHash: "" }] }), /contentHash/u);
});
