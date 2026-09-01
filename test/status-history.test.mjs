import assert from "node:assert/strict";
import test from "node:test";

import { buildStatusHistory } from "../src/modules/snapshot/static-api/status-history.mjs";

function run(completedAt, overrides = {}) {
  return {
    startedAt: new Date(Date.parse(completedAt) - 60_000).toISOString(),
    completedAt,
    durationMs: 60_000,
    outcome: "healthy",
    communities: 3,
    successful: 3,
    failed: 0,
    noOpenings: 1,
    openOpportunities: 5,
    ...overrides,
  };
}

test("appends, replaces, orders, and prunes synchronization runs", () => {
  const completedAt = "2026-09-01T12:00:00.000Z";
  const history = buildStatusHistory({
    startedAt: "2026-09-01T11:58:00.000Z",
    completedAt,
    repositories: [
      { repository: "community/a" },
      { repository: "community/b" },
      { repository: "community/c" },
    ],
    synchronizedRepositories: ["community/a", "community/b"],
    failedRepositories: [
      { repository: "community/c", error: "private provider failure" },
    ],
    status: { totals: { noOpenings: 1 } },
    openOpportunities: 7,
    previousHistory: {
      generatedAt: "2026-09-01T11:00:00.000Z",
      retentionDays: 30,
      runs: [
        run(completedAt, { openOpportunities: 999 }),
        run("2026-08-31T12:00:00.000Z", { openOpportunities: 6 }),
        run("2026-08-02T12:00:00.000Z", { openOpportunities: 4 }),
        run("2026-08-02T11:59:59.999Z", { openOpportunities: 3 }),
      ],
    },
  });

  assert.equal(history.generatedAt, completedAt);
  assert.equal(history.retentionDays, 30);
  assert.deepEqual(
    history.runs.map((item) => item.completedAt),
    [
      "2026-09-01T12:00:00.000Z",
      "2026-08-31T12:00:00.000Z",
      "2026-08-02T12:00:00.000Z",
    ],
  );
  assert.deepEqual(history.runs[0], {
    startedAt: "2026-09-01T11:58:00.000Z",
    completedAt,
    durationMs: 120_000,
    outcome: "partial",
    communities: 3,
    successful: 2,
    failed: 1,
    noOpenings: 1,
    openOpportunities: 7,
  });
  assert.equal(JSON.stringify(history).includes("private provider failure"), false);
});

test("aggregates retained runs by day using the latest opportunity total", () => {
  const history = buildStatusHistory({
    startedAt: "2026-09-01T17:59:00.000Z",
    completedAt: "2026-09-01T18:00:00.000Z",
    repositories: [{ repository: "community/a" }],
    synchronizedRepositories: ["community/a"],
    failedRepositories: [],
    status: { totals: { noOpenings: 0 } },
    openOpportunities: 8,
    previousHistory: {
      runs: [
        run("2026-09-01T12:00:00.000Z", {
          outcome: "partial",
          failed: 2,
          successful: 1,
          openOpportunities: 7,
        }),
        run("2026-08-31T12:00:00.000Z", { openOpportunities: 6 }),
      ],
    },
  });

  assert.deepEqual(history.days, [
    {
      date: "2026-09-01",
      runs: 2,
      partialRuns: 1,
      failedCommunityRuns: 2,
      latestOpenOpportunities: 8,
    },
    {
      date: "2026-08-31",
      runs: 1,
      partialRuns: 0,
      failedCommunityRuns: 0,
      latestOpenOpportunities: 6,
    },
  ]);
});
