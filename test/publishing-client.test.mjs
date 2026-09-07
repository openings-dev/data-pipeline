import assert from "node:assert/strict";
import test from "node:test";

import { buildPublishingHeaders } from "../src/modules/publishing/publishing-client.mjs";

test("builds the exact signed headers expected by the publishing platform", async () => {
  const headers = await buildPublishingHeaders({
    clientId: "openings-data",
    secret: "test-secret",
    tenant: "openings",
    timestamp: "2026-09-04T12:00:00.000Z",
    nonce: "nonce-1",
    body: "{\"ok\":true}",
  });
  assert.equal(headers["x-pub-client"], "openings-data");
  assert.equal(headers["x-pub-tenant"], "openings");
  assert.match(headers["x-pub-content-sha256"], /^[a-f0-9]{64}$/u);
  assert.match(headers["x-pub-signature"], /^[a-f0-9]{64}$/u);
  assert.equal(headers["x-pub-signature"], "20caeba52b4afce629e0dc6a2a2027ebb836ba1b608a69084c8289f37e344661");
});

test("posts to the fixed publication intake path", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return new Response("{}", { status: 202 });
  };
  const { send } = createFixture(fetchImpl);
  const response = await send({ identity: { tenant: "openings", idempotencyKey: "key" } });
  assert.equal(response.status, 202);
  assert.equal(captured.url, "https://shadow.example/v1/publications");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers["x-pub-client"], "openings-data");
});

function createFixture(fetchImpl) {
  return {
    send: async (envelope) => {
      const { createPublishingSender } = await import("../src/modules/publishing/publishing-client.mjs");
      return createPublishingSender({
        endpoint: "https://shadow.example",
        clientId: "openings-data",
        secret: "test-secret",
        fetchImpl,
        now: () => new Date("2026-09-04T12:00:00.000Z"),
        createNonce: () => "nonce-1",
      })(envelope);
    },
  };
}
