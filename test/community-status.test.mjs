import assert from "node:assert/strict";
import test from "node:test";

import { buildCommunityStatus } from "../src/modules/snapshot/static-api/community-status.mjs";

const repositories = [
  {
    repository: "community/active",
    owner: "community",
    url: "https://github.com/community/active",
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
  },
  {
    repository: "community/empty",
    owner: "community",
    url: "https://github.com/community/empty",
    country: "Portugal",
    countryCode: "PT",
    region: "Europe",
  },
  {
    repository: "community/failing",
    owner: "community",
    url: "https://github.com/community/failing",
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
  },
  {
    repository: "community/not-scanned",
    owner: "community",
    url: "https://github.com/community/not-scanned",
    country: "Canada",
    countryCode: "CA",
    region: "North America",
  },
];

test("reports healthy, no-openings, and error states without exposing raw errors", () => {
  const status = buildCommunityStatus({
    generatedAt: "2026-08-31T12:00:00.000Z",
    repositories,
    synchronizedRepositories: ["community/active", "community/empty"],
    failedRepositories: [{ repository: "community/failing", error: "secret upstream details" }],
    previousStatus: {
      items: [{
        repository: "community/failing",
        lastSuccessfulSyncAt: "2026-08-30T12:00:00.000Z",
        openOpportunities: 5,
        lastPostedAt: "2026-08-28T12:00:00.000Z",
      }, {
        repository: "community/not-scanned",
        state: "healthy",
        lastSuccessfulSyncAt: "2026-08-29T12:00:00.000Z",
        openOpportunities: 3,
        lastPostedAt: "2026-08-27T12:00:00.000Z",
      }],
    },
    items: [{
      id: "canonical",
      repository: "community/active",
      createdAt: "2026-08-29T12:00:00.000Z",
      issueState: "open",
      sources: [
        {
          repository: "community/active",
          createdAt: "2026-08-29T12:00:00.000Z",
        },
        {
          repository: "community/failing",
          createdAt: "2026-08-30T12:00:00.000Z",
        },
      ],
    }],
  });

  assert.deepEqual(status.totals, {
    communities: 4,
    healthy: 2,
    noOpenings: 1,
    errors: 1,
  });
  assert.deepEqual(status.items.find((item) => item.repository === "community/active"), {
    repository: "community/active",
    repositoryUrl: "https://github.com/community/active",
    name: "community",
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
    state: "healthy",
    openOpportunities: 1,
    lastSuccessfulSyncAt: "2026-08-31T12:00:00.000Z",
    lastPostedAt: "2026-08-29T12:00:00.000Z",
  });
  assert.equal(
    status.items.find((item) => item.repository === "community/empty").state,
    "no-openings",
  );
  assert.deepEqual(
    status.items.find((item) => item.repository === "community/failing"),
    {
      repository: "community/failing",
      repositoryUrl: "https://github.com/community/failing",
      name: "community",
      country: "Brazil",
      countryCode: "BR",
      region: "South America",
      state: "error",
      openOpportunities: 5,
      lastSuccessfulSyncAt: "2026-08-30T12:00:00.000Z",
      lastPostedAt: "2026-08-28T12:00:00.000Z",
    },
  );
  assert.doesNotMatch(JSON.stringify(status), /secret upstream details/);
  assert.deepEqual(
    status.items.find((item) => item.repository === "community/not-scanned"),
    {
      repository: "community/not-scanned",
      repositoryUrl: "https://github.com/community/not-scanned",
      name: "community",
      country: "Canada",
      countryCode: "CA",
      region: "North America",
      state: "healthy",
      openOpportunities: 3,
      lastSuccessfulSyncAt: "2026-08-29T12:00:00.000Z",
      lastPostedAt: "2026-08-27T12:00:00.000Z",
    },
  );
});
