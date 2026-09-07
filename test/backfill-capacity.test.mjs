import assert from "node:assert/strict";
import test from "node:test";
import { assertBackfillCapacity } from "../src/modules/publishing/backfill-capacity.mjs";
import { loadD1AccountUsage } from "../src/modules/publishing/cloudflare-account-usage.mjs";

const estimate = { d1RowsRead: 30_000, d1RowsWritten: 650, queueOperations: 30, r2Bytes: 3_732_762 };
test("accepts a backfill strictly below forty percent of every free allowance", () => {
  assert.equal(assertBackfillCapacity([
    { resource: "d1RowsRead", projected: 0, free_allowance: 5_000_000 },
    { resource: "d1RowsWritten", projected: 0, free_allowance: 100_000 },
    { resource: "queueOperations", projected: 0, free_allowance: 10_000 },
    { resource: "r2Bytes", projected: 0, free_allowance: 10_737_418_240 },
  ], estimate), true);
});
test("fails closed when current usage makes the same backfill unsafe", () => {
  assert.throws(() => assertBackfillCapacity([
    { resource: "d1RowsRead", projected: 0, free_allowance: 5_000_000 },
    { resource: "d1RowsWritten", projected: 0, free_allowance: 100_000 },
    { resource: "queueOperations", projected: 3_980, free_allowance: 10_000 },
    { resource: "r2Bytes", projected: 0, free_allowance: 10_737_418_240 },
  ], estimate), /40%/u);
});

test("fails closed when any required account-wide counter is absent", () => {
  assert.throws(() => assertBackfillCapacity([
    { resource: "d1RowsWritten", projected: 0, free_allowance: 100_000 },
    { resource: "queueOperations", projected: 0, free_allowance: 10_000 },
    { resource: "r2Bytes", projected: 0, free_allowance: 10_737_418_240 },
  ], estimate), /d1RowsRead.*missing/u);
});

test("loads account-wide D1 reads and writes from Cloudflare Analytics", async () => {
  const calls = [];
  const usage = await loadD1AccountUsage({
    accountId: "account-123",
    apiToken: "secret",
    now: new Date("2026-09-05T12:00:00Z"),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ data: { viewer: { accounts: [{
        d1AnalyticsAdaptiveGroups: [
          { sum: { rowsRead: 1_200, rowsWritten: 34 } },
          { sum: { rowsRead: 300, rowsWritten: 6 } },
        ],
      }] } } }));
    },
  });
  assert.deepEqual(usage, [
    { resource: "d1RowsRead", projected: 1_500, free_allowance: 5_000_000 },
    { resource: "d1RowsWritten", projected: 40, free_allowance: 100_000 },
  ]);
  assert.equal(calls[0].url, "https://api.cloudflare.com/client/v4/graphql");
  assert.equal(calls[0].options.headers.authorization, "Bearer secret");
  assert.deepEqual(JSON.parse(calls[0].options.body).variables, { accountTag: "account-123", date: "2026-09-05" });
});

test("fails closed when Cloudflare Analytics returns incomplete data", async () => {
  await assert.rejects(loadD1AccountUsage({
    accountId: "account-123", apiToken: "secret",
    fetchImpl: async () => new Response(JSON.stringify({ data: { viewer: { accounts: [] } } })),
  }), /uncertain/u);
});
