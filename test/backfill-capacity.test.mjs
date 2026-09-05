import assert from "node:assert/strict";
import test from "node:test";
import { assertBackfillCapacity } from "../src/modules/publishing/backfill-capacity.mjs";

const estimate = { d1Rows: 17_160, queueOperations: 3_960, r2Bytes: 3_732_762 };
test("accepts a backfill strictly below forty percent of every free allowance", () => {
  assert.equal(assertBackfillCapacity([
    { resource: "d1Rows", projected: 0, free_allowance: 100_000 },
    { resource: "queueOperations", projected: 0, free_allowance: 10_000 },
    { resource: "r2Bytes", projected: 0, free_allowance: 10_737_418_240 },
  ], estimate), true);
});
test("fails closed when current usage makes the same backfill unsafe", () => {
  assert.throws(() => assertBackfillCapacity([
    { resource: "queueOperations", projected: 100, free_allowance: 10_000 },
  ], estimate), /40%/u);
});
