import assert from "node:assert/strict";
import test from "node:test";

import { sortOpportunitiesByDate } from "../src/modules/opportunities/opportunity-sorting.mjs";
import { buildStaticApiFiles } from "../src/modules/snapshot/static-api/build-static-api-files.mjs";

function createOpportunity({ sourceId, title, createdAt, sponsored = false }) {
  return {
    id: sourceId,
    sourceId,
    title,
    description: `${title} description`,
    excerpt: `${title} description`,
    issueState: "open",
    repository: "example/jobs",
    repositoryUrl: "https://github.com/example/jobs",
    region: "Global",
    country: "Global",
    tags: ["remote"],
    author: {
      id: "example",
      name: "Example",
      handle: "example",
      avatarUrl: "https://github.com/example.png",
    },
    community: {
      id: "example",
      name: "Example",
      avatarUrl: "https://github.com/example.png",
      repository: "example/jobs",
      url: "https://github.com/example/jobs",
    },
    createdAt,
    updatedAt: createdAt,
    url: `https://github.com/example/jobs/issues/${sourceId.split("#")[1]}`,
    sourceType: "github-issue",
    ...(sponsored ? { promotion: { type: "sponsored" } } : {}),
  };
}

const repositories = [{
  repository: "example/jobs",
  owner: "example",
  name: "jobs",
  url: "https://github.com/example/jobs",
  country: "Global",
  countryCode: "GLOBAL",
  region: "Global",
  locale: "en",
  scope: "global",
}];

test("static API publishes sponsored jobs before newer organic jobs", () => {
  const items = [
    createOpportunity({
      sourceId: "example/jobs#1",
      title: "Newest organic",
      createdAt: "2026-08-31T00:00:00.000Z",
    }),
    createOpportunity({
      sourceId: "example/jobs#2",
      title: "Older sponsored",
      createdAt: "2026-08-01T00:00:00.000Z",
      sponsored: true,
    }),
    createOpportunity({
      sourceId: "example/jobs#3",
      title: "Newer sponsored",
      createdAt: "2026-08-15T00:00:00.000Z",
      sponsored: true,
    }),
  ];
  const files = buildStaticApiFiles({
    snapshotRootDir: "/tmp/openings-sponsored-static-api-test",
    generatedAt: "2026-08-31T12:00:00.000Z",
    countrySnapshots: [{
      repositoryShards: [{ payload: { items } }],
    }],
    repositories,
  });
  const file = (relativePath) =>
    files.find((candidate) => candidate.relativePath === relativePath)?.payload;
  const page = file("api/pages/page-0001.json");
  const manifest = file("api/manifest.json");
  const promotions = file("api/promotions.json");

  assert.deepEqual(
    page.items.map((item) => item.title),
    ["Newer sponsored", "Older sponsored", "Newest organic"],
  );
  assert.equal(manifest.schemaVersion, 5);
  assert.equal(manifest.totals.sponsoredOpportunities, 2);
  assert.equal(manifest.files.promotions, "api/promotions.json");
  assert.deepEqual(promotions.ids, page.items.slice(0, 2).map((item) => item.id));
});

test("recent sorting uses opportunity ID as a stable final tie-breaker", () => {
  const left = createOpportunity({
    sourceId: "example/jobs#10",
    title: "B",
    createdAt: "2026-08-31T00:00:00.000Z",
    sponsored: true,
  });
  const right = createOpportunity({
    sourceId: "example/jobs#9",
    title: "A",
    createdAt: "2026-08-31T00:00:00.000Z",
    sponsored: true,
  });
  left.id = "b";
  right.id = "a";

  assert.deepEqual(
    sortOpportunitiesByDate([left, right]).map((item) => item.id),
    ["a", "b"],
  );
});
