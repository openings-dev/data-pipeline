import assert from "node:assert/strict";
import test from "node:test";

import { buildNewJobPublications } from "../src/modules/publishing/job-publications.mjs";

const job = {
  id: "gh_123",
  title: "Backend Engineer",
  excerpt: "Build reliable systems",
  contentHash: "a".repeat(64),
  createdAt: "2026-09-04T12:00:00.000Z",
  author: { handle: "alice", name: "Alice", avatarUrl: "https://example.com/alice.png" },
  community: { repository: "acme/jobs", name: "Acme Jobs", url: "https://github.com/acme/jobs" },
};

test("creates isolated web entities for a genuinely new job", () => {
  const publications = buildNewJobPublications({ previousIds: [], jobs: [job] });
  const [publication] = publications;
  assert.deepEqual(publications.map((item) => item.identity.sourceType), ["job", "author", "community"]);
  assert.equal(publication.identity.tenant, "openings");
  assert.equal(publication.identity.idempotencyKey, `openings:job:gh_123:${job.contentHash}`);
  assert.equal(publication.deliveries[0].adapter, "web.r2");
  assert.equal(publication.deliveries[0].payload.type, "web.page");
  assert.deepEqual(publication.deliveries[0].payload.entity, {
    schemaVersion: 1, tenant: "openings", kind: "job", id: "gh_123",
    revision: job.contentHash, canonicalPath: "/jobs/gh_123", title: "Backend Engineer",
    summary: "Build reliable systems", status: "active",
    contentSha256: publication.deliveries[0].payload.entity.contentSha256,
    content: job,
  });
  assert.match(publication.deliveries[0].payload.entity.contentSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(publications.slice(1).map((item) => item.deliveries[0].payload.entity.kind), ["author", "community"]);
  assert.equal(publications.some((item) => item.deliveries.some((delivery) => delivery.adapter === "push.onesignal")), false);
});

test("does not republish jobs already present in the prior snapshot", () => {
  assert.deepEqual(buildNewJobPublications({ previousIds: [job.id], jobs: [job] }), []);
});

test("sorts deterministic output and rejects incomplete records", () => {
  const second = { ...job, id: "gh_001", contentHash: "b".repeat(64) };
  assert.deepEqual(
    buildNewJobPublications({ previousIds: [], jobs: [job, second] })
      .filter((item) => item.identity.sourceType === "job").map((item) => item.identity.sourceId),
    ["gh_001", "gh_123"],
  );
  const sharedProfiles = buildNewJobPublications({ previousIds: [], jobs: [job, second] });
  assert.equal(sharedProfiles.filter((item) => item.identity.sourceType === "author").length, 1);
  assert.equal(sharedProfiles.filter((item) => item.identity.sourceType === "community").length, 1);
  assert.throws(() => buildNewJobPublications({ previousIds: [], jobs: [{ ...job, contentHash: "" }] }), /contentHash/u);
});
