import assert from "node:assert/strict";
import test from "node:test";

import { canonicalOpportunity } from "../src/modules/opportunities/canonical-opportunity.mjs";
import {
  buildDataProvenance,
  mergeDataProvenance,
} from "../src/modules/opportunities/data-provenance.mjs";
import { mapIssueToOpportunity } from "../src/modules/opportunities/opportunity-mapper.mjs";

test("classifies declared, inferred, and unknown job facts", () => {
  assert.deepEqual(buildDataProvenance({
    jobLocation: {
      confidence: "explicit",
      country: "Portugal",
      workModel: "remote",
    },
    salary: { currency: "EUR", min: 60000, period: "year" },
    taxonomy: { seniority: ["senior"], workModels: ["remote"] },
    declaredFields: new Set(["location", "workModel"]),
  }), {
    location: "declared",
    salary: "inferred",
    seniority: "inferred",
    workModel: "declared",
  });

  assert.deepEqual(buildDataProvenance({
    jobLocation: { confidence: "unknown" },
    taxonomy: { seniority: [], workModels: [] },
  }), {
    location: "unknown",
    salary: "unknown",
    seniority: "unknown",
    workModel: "unknown",
  });
});

test("marks explicit location and work model facts as declared", () => {
  const opportunity = mapIssueToOpportunity({
    id: 1,
    number: 7,
    title: "[Remote/Portugal] Senior Platform Engineer",
    body: "Location: Portugal\n\nSalary: EUR 60,000–80,000 per year.",
    state: "open",
    html_url: "https://github.com/openings-dev/jobs/issues/7",
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    labels: [],
  }, {
    repository: "openings-dev/jobs",
    owner: "openings-dev",
    url: "https://github.com/openings-dev/jobs",
    country: "Global",
    countryCode: "GLOBAL",
    region: "Global",
  });

  assert.deepEqual(opportunity.dataProvenance, {
    location: "declared",
    salary: "inferred",
    seniority: "inferred",
    workModel: "declared",
  });
});

test("keeps parser-derived salary and seniority inferred", () => {
  const opportunity = mapIssueToOpportunity({
    id: 2,
    number: 8,
    title: "Senior Backend Engineer",
    body: "Salary: USD 120,000 per year. Join a remote-first platform team.",
    state: "open",
    html_url: "https://github.com/community/jobs/issues/8",
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    labels: [],
  }, {
    repository: "community/jobs",
    owner: "community",
    url: "https://github.com/community/jobs",
    country: "Global",
    countryCode: "GLOBAL",
    region: "Global",
  });

  assert.equal(opportunity.dataProvenance.salary, "inferred");
  assert.equal(opportunity.dataProvenance.seniority, "inferred");
  assert.equal(opportunity.dataProvenance.location, "unknown");
  assert.equal(opportunity.dataProvenance.workModel, "inferred");
});

test("a duplicate group keeps the strongest evidence per field", () => {
  const inferred = {
    dataProvenance: {
      location: "inferred",
      salary: "inferred",
      seniority: "unknown",
      workModel: "inferred",
    },
  };
  const declared = {
    dataProvenance: {
      location: "declared",
      salary: "unknown",
      seniority: "declared",
      workModel: "unknown",
    },
  };

  assert.deepEqual(mergeDataProvenance([inferred, declared]), {
    location: "declared",
    salary: "inferred",
    seniority: "declared",
    workModel: "inferred",
  });

  const base = {
    id: "one",
    sourceId: "community/a#1",
    title: "Senior Platform Engineer",
    description: "Build APIs.",
    repository: "community/a",
    repositoryUrl: "https://github.com/community/a",
    country: "Global",
    region: "Global",
    sourceLocation: { country: "Global", countryCode: "GLOBAL", region: "Global" },
    jobLocation: { country: "Portugal", confidence: "explicit" },
    tags: [],
    sourceTags: [],
    taxonomy: { seniority: ["senior"] },
    author: {},
    community: {},
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    url: "https://github.com/community/a/issues/1",
    sourceType: "github-issue",
    ...inferred,
  };
  const canonical = canonicalOpportunity([
    base,
    {
      ...base,
      id: "two",
      sourceId: "community/b#2",
      repository: "community/b",
      createdAt: "2026-08-02T00:00:00.000Z",
      ...declared,
    },
  ]);

  assert.deepEqual(canonical.dataProvenance, {
    location: "declared",
    salary: "inferred",
    seniority: "declared",
    workModel: "inferred",
  });
});
