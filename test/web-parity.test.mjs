import assert from "node:assert/strict";
import test from "node:test";
import {
  verifyWebPublication,
  verifyWebPublicationWithRetry,
} from "../src/modules/publishing/web-parity.mjs";

const publication = { deliveries: [{ payload: { entity: {
  canonicalPath: "/communities/acme/jobs", title: "Acme & Jobs",
} } }] };

test("accepts an activated entity with exact metadata", async () => {
  const response = new Response('<title>Acme &amp; Jobs | openings.dev</title><link rel="canonical" href="https://openings.dev/communities/acme/jobs">', {
    headers: { "x-publishing-revision": "rev-1" },
  });
  assert.deepEqual(await verifyWebPublication(response, publication), []);
});

test("rejects a generic shell that masks a missing entity with HTTP 200", async () => {
  const response = new Response("<title>openings.dev</title>");
  assert.deepEqual(await verifyWebPublication(response, publication), [
    "missing publishing revision", "missing title", "missing canonical URL",
  ]);
});

test("retries a transient generic shell before accepting the exact entity", async () => {
  let attempts = 0;
  const result = await verifyWebPublicationWithRetry(async () => {
    attempts += 1;
    if (attempts === 1) return new Response("<title>openings.dev</title>");
    return new Response('<title>Acme &amp; Jobs | openings.dev</title><link rel="canonical" href="https://openings.dev/communities/acme/jobs">', {
      headers: { "x-publishing-revision": "rev-1" },
    });
  }, publication, { maximumAttempts: 3, retryDelayMs: 0 });

  assert.deepEqual(result, []);
  assert.equal(attempts, 2);
});

test("still rejects a persistent generic shell after the bounded attempts", async () => {
  let attempts = 0;
  const result = await verifyWebPublicationWithRetry(async () => {
    attempts += 1;
    return new Response("<title>openings.dev</title>");
  }, publication, { maximumAttempts: 3, retryDelayMs: 0 });

  assert.deepEqual(result, [
    "missing publishing revision", "missing title", "missing canonical URL",
  ]);
  assert.equal(attempts, 3);
});
