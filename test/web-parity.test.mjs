import assert from "node:assert/strict";
import test from "node:test";
import {
  createWebParityRequest,
  selectWebParityBatch,
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

test("selects a deterministic bounded parity batch", () => {
  const publications = Array.from({ length: 7 }, (_, index) => ({ index }));
  assert.deepEqual(selectWebParityBatch(publications, { offset: 2, limit: 3 }), {
    publications: [{ index: 2 }, { index: 3 }, { index: 4 }],
    offset: 2,
    nextOffset: 5,
    total: 7,
    complete: false,
  });
  assert.deepEqual(selectWebParityBatch(publications, { offset: 5, limit: 3 }), {
    publications: [{ index: 5 }, { index: 6 }],
    offset: 5,
    nextOffset: 7,
    total: 7,
    complete: true,
  });
});

test("rejects parity batches that could create an unbounded live scan", () => {
  const publications = Array.from({ length: 1_321 }, (_, index) => ({ index }));
  assert.throws(() => selectWebParityBatch(publications, { offset: 0, limit: 0 }), /between 1 and 500/u);
  assert.throws(() => selectWebParityBatch(publications, { offset: 0, limit: 501 }), /between 1 and 500/u);
  assert.throws(() => selectWebParityBatch(publications, { offset: -1, limit: 1 }), /non-negative/u);
});

test("bounds every live parity request with an abort signal", () => {
  const request = createWebParityRequest("https://preview.test/jobs/job-1", 5_000);
  assert.equal(request.url, "https://preview.test/jobs/job-1");
  assert.deepEqual(request.init.headers, { "cache-control": "no-cache" });
  assert.equal(request.init.signal instanceof AbortSignal, true);
  assert.throws(() => createWebParityRequest("https://preview.test/jobs/job-1", 0), /between 1 and 15000/u);
  assert.throws(() => createWebParityRequest("https://preview.test/jobs/job-1", 15_001), /between 1 and 15000/u);
});
