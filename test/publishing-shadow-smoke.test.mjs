import assert from "node:assert/strict";
import test from "node:test";

import { runPublishingShadowSmoke } from "../src/modules/publishing/publishing-shadow-smoke.mjs";

const job = {
  id: "gh_123",
  title: "Backend Engineer",
  excerpt: "Build reliable systems",
  contentHash: "a".repeat(64),
  author: { handle: "alice", name: "Alice" },
  community: { repository: "acme/jobs", name: "Acme Jobs" },
};

test("submits job, author, and community web entities without push", async () => {
  const submitted = [];
  const result = await runPublishingShadowSmoke({
    job,
    send: async (envelope) => {
      submitted.push(envelope);
      return { status: 202 };
    },
  });

  assert.deepEqual(result, { accepted: 3, pending: 0 });
  assert.equal(submitted.length, 3);
  assert.deepEqual(submitted.map((item) => item.identity.sourceType), ["job", "author", "community"]);
  assert.equal(submitted.every((item) => item.deliveries.length === 1 && item.deliveries[0].adapter === "web.r2"), true);
});

test("fails without losing the publication when staging does not accept it", async () => {
  await assert.rejects(
    runPublishingShadowSmoke({ job, send: async () => ({ status: 429 }) }),
    /retained 3 publication/u,
  );
});
