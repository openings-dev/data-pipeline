import assert from "node:assert/strict";
import test from "node:test";

import { buildStaticApiFiles } from "../src/modules/snapshot/static-api/build-static-api-files.mjs";

function item(overrides = {}) {
  return {
    id: "community/a#1",
    sourceId: "community/a#1",
    title: "Senior React Engineer",
    description: "Build React applications for Acme.",
    excerpt: "Build React applications",
    issueState: "open",
    contentHash: "content-a",
    repository: "community/a",
    repositoryUrl: "https://github.com/community/a",
    region: "South America",
    country: "Brazil",
    sourceLocation: { country: "Brazil", countryCode: "BR", region: "South America" },
    jobLocation: { country: "Brazil", countryCode: "BR", region: "South America", workModel: "remote", remoteScope: "country", confidence: "explicit" },
    tags: ["React", "Senior", "Remote", "remote"],
    sourceTags: ["React", "Senior", "Remote", "remote"],
    taxonomy: {
      areas: ["frontend"],
      technologies: ["react", "typescript"],
      seniority: ["senior"],
      employmentTypes: ["full-time"],
      workModels: ["remote"],
      languages: ["en"],
    },
    author: { id: "author", name: "Author", handle: "author", avatarUrl: "" },
    community: { id: "community", name: "Community", avatarUrl: "", repository: "community/a", url: "https://github.com/community/a" },
    companyName: "Acme",
    salary: { currency: "USD", min: 100000, period: "year" },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    url: "https://github.com/community/a/issues/1",
    sourceType: "github-issue",
    ...overrides,
  };
}

const repositories = [
  { repository: "community/a", owner: "community", name: "a", url: "https://github.com/community/a", country: "Brazil", countryCode: "BR", region: "South America", locale: "pt-BR", scope: "national" },
  { repository: "community/b", owner: "community", name: "b", url: "https://github.com/community/b", country: "Brazil", countryCode: "BR", region: "South America", locale: "pt-BR", scope: "national" },
];

test("publishes schema 6 structured facets, weighted search fields, and source aliases", () => {
  const files = buildStaticApiFiles({
    snapshotRootDir: "/tmp/openings-discovery-static-api-test",
    startedAt: "2026-08-30T23:59:00.000Z",
    generatedAt: "2026-08-31T00:00:00.000Z",
    countrySnapshots: [{ repositoryShards: [{ payload: { items: [
      item(),
      item({
        id: "community/b#2",
        sourceId: "community/b#2",
        repository: "community/b",
        repositoryUrl: "https://github.com/community/b",
        url: "https://github.com/community/b/issues/2",
      }),
    ] } }] }],
    repositories,
  });
  const payload = (name) => files.find(({ relativePath }) => relativePath === name)?.payload;
  const manifest = payload("api/manifest.json");
  const facets = payload("api/facet-index.json");
  const search = payload("api/search-index.json");
  const aliases = payload("api/aliases.json");
  const status = payload("api/status.json");
  const statusHistory = payload("api/status-history.json");
  const page = payload("api/pages/page-0001.json");
  const canonicalId = payload("api/job-ids.json").ids[0];
  const authorProfile = payload("api/authors/author.json");

  assert.equal(manifest.schemaVersion, 6);
  assert.equal(manifest.totals.openOpportunities, 1);
  assert.equal(manifest.totals.authors, 1);
  assert.equal(manifest.totals.authorArtifactBytes > 0, true);
  assert.equal(authorProfile.schemaVersion, 1);
  assert.equal(authorProfile.author.handle, "author");
  assert.equal(manifest.files.aliases, "api/aliases.json");
  assert.equal(manifest.files.status, "api/status.json");
  assert.equal(manifest.files.statusHistory, "api/status-history.json");
  assert.deepEqual(facets.dimensions.jobCountries.Brazil, [canonicalId]);
  assert.deepEqual(facets.dimensions.workModels.remote, [canonicalId]);
  assert.deepEqual(facets.dimensions.tags.remote, [canonicalId]);
  assert.equal(manifest.facets.tags.remote, 1);
  assert.deepEqual(facets.dimensions.technologies.react, [canonicalId]);
  assert.deepEqual(facets.dimensions.salaryDisclosed.true, [canonicalId]);
  assert.deepEqual(facets.dimensions.freshness["30"], [canonicalId]);
  assert.deepEqual(facets.dimensions.freshness.fresh, [canonicalId]);
  assert.equal(search.items[0].fields.title, "senior react engineer");
  assert.equal(search.items[0].createdAt, "2026-08-01T00:00:00.000Z");
  assert.match(search.items[0].fields.taxonomy, /typescript/);
  assert.equal(aliases.ids["community/a#1"], canonicalId);
  assert.equal(aliases.ids["community/b#2"], canonicalId);
  assert.equal(status.items.length, 2);
  assert.equal(status.items.every((item) => item.openOpportunities === 1), true);
  assert.equal(statusHistory.retentionDays, 30);
  assert.equal(statusHistory.runs[0].durationMs, 60_000);
  assert.equal(statusHistory.runs[0].openOpportunities, 1);
  assert.deepEqual(page.items[0].dataProvenance, {
    location: "declared",
    salary: "inferred",
    seniority: "inferred",
    workModel: "declared",
  });
});

test("enriches legacy snapshot items while rebuilding the static API", () => {
  const legacy = item({
    title: "Python internship — Remote Brazil",
    description: "Location: Brazil\nRemote role using Python and Django.",
  });
  delete legacy.sourceLocation;
  delete legacy.jobLocation;
  delete legacy.sourceTags;
  delete legacy.taxonomy;
  const files = buildStaticApiFiles({
    snapshotRootDir: "/tmp/openings-legacy-static-api-test",
    generatedAt: "2026-08-31T00:00:00.000Z",
    countrySnapshots: [{ repositoryShards: [{ payload: { items: [legacy] } }] }],
    repositories,
  });
  const page = files.find(({ relativePath }) => relativePath === "api/pages/page-0001.json");
  const enriched = page.payload.items[0];

  assert.equal(enriched.jobLocation.country, "Brazil");
  assert.deepEqual(enriched.taxonomy.technologies, ["django", "python", "react"]);
  assert.deepEqual(enriched.sourceTags, [...legacy.tags].sort());
});
