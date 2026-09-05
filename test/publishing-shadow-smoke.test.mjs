import assert from "node:assert/strict";
import test from "node:test";

import { runPublishingShadowSmoke } from "../src/modules/publishing/publishing-shadow-smoke.mjs";

const job = {
  id: "gh_123",
  title: "Backend Engineer",
  excerpt: "Build reliable systems",
  contentHash: "a".repeat(64),
};

test("submits one real web-plus-push envelope without enabling providers", async () => {
  const submitted = [];
  const result = await runPublishingShadowSmoke({
    job,
    send: async (envelope) => {
      submitted.push(envelope);
      return { status: 202 };
    },
  });

  assert.deepEqual(result, { accepted: 1, pending: 0 });
  assert.equal(submitted.length, 1);
  assert.deepEqual(submitted[0].deliveries.map((delivery) => delivery.adapter), ["web.r2", "push.onesignal"]);
  assert.deepEqual(submitted[0].deliveries[1].dependsOn, [{ deliveryId: "web", state: "verified" }]);
});

test("fails without losing the publication when staging does not accept it", async () => {
  await assert.rejects(
    runPublishingShadowSmoke({ job, send: async () => ({ status: 429 }) }),
    /retained 1 publication/u,
  );
});
