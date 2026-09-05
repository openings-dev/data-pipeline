import assert from "node:assert/strict";
import test from "node:test";

import { dispatchPublishingOutbox, mergePublishingOutbox } from "../src/modules/publishing/publishing-outbox.mjs";

const envelope = (key) => ({ identity: { idempotencyKey: key } });

test("durable outbox merge is idempotent", () => {
  assert.deepEqual(
    mergePublishingOutbox([envelope("one")], [envelope("one"), envelope("two")]).map((item) => item.identity.idempotencyKey),
    ["one", "two"],
  );
});

test("removes only publications durably accepted by the platform", async () => {
  const send = async (item) => item.identity.idempotencyKey === "one"
    ? { status: 202 }
    : { status: 429, retryAfter: "300" };
  const result = await dispatchPublishingOutbox([envelope("one"), envelope("two")], send);
  assert.deepEqual(result.remaining.map((item) => item.identity.idempotencyKey), ["two"]);
  assert.deepEqual(result, { accepted: 1, remaining: [envelope("two")] });
});

test("a transport failure retains the envelope for a later retry", async () => {
  const result = await dispatchPublishingOutbox([envelope("one")], async () => {
    throw new Error("lost response");
  });
  assert.deepEqual(result, { accepted: 0, remaining: [envelope("one")] });
});
