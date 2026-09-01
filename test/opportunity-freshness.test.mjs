import assert from "node:assert/strict";
import test from "node:test";

import { classifyFreshness } from "../src/modules/opportunities/opportunity-freshness.mjs";

const NOW = "2026-08-31T00:00:00.000Z";

function daysAgo(days) {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString();
}

test("classifies exact freshness boundaries", () => {
  assert.deepEqual(classifyFreshness(daysAgo(7), NOW), {
    ageDays: 7,
    publishedAt: daysAgo(7),
    status: "fresh",
  });
  assert.equal(classifyFreshness(daysAgo(30), NOW).status, "fresh");
  assert.equal(classifyFreshness(daysAgo(31), NOW).status, "aging");
  assert.equal(classifyFreshness(daysAgo(90), NOW).status, "aging");
  assert.equal(classifyFreshness(daysAgo(91), NOW).status, "stale");
});

test("clamps future publication dates to zero days", () => {
  const future = new Date(Date.parse(NOW) + 86_400_000).toISOString();
  assert.equal(classifyFreshness(future, NOW).ageDays, 0);
});

