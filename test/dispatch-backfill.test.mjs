import assert from "node:assert/strict";
import test from "node:test";
import { dispatchBackfill } from "../src/modules/publishing/dispatch-backfill.mjs";

const publications = ["a", "b", "c"].map((key) => ({ identity: { idempotencyKey: key } }));

test("dispatches a bounded concurrent backfill and reports every failure", async () => {
  const active = { value: 0, maximum: 0 };
  const result = await dispatchBackfill(publications, async (publication) => {
    active.value += 1; active.maximum = Math.max(active.maximum, active.value);
    await Promise.resolve(); active.value -= 1;
    return { status: publication.identity.idempotencyKey === "b" ? 503 : 202 };
  }, 2);
  assert.deepEqual(result, { accepted: 2, failures: [{ idempotencyKey: "b", status: 503 }] });
  assert.equal(active.maximum <= 2, true);
});

test("rejects unsafe concurrency", async () => {
  await assert.rejects(dispatchBackfill(publications, async () => ({ status: 202 }), 9), /between 1 and 8/u);
});
