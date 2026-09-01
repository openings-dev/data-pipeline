import assert from "node:assert/strict";
import test from "node:test";

import { extractStructuredTaxonomy } from "../src/modules/opportunities/structured-taxonomy.mjs";
import { mapIssueToOpportunity } from "../src/modules/opportunities/opportunity-mapper.mjs";

test("classifies job facts while excluding operational labels", () => {
  assert.deepEqual(extractStructuredTaxonomy({
    title: "Senior React Frontend Engineer - Remote",
    body: "Full-time contractor. English C1. TypeScript and Next.js.",
    labels: ["frontend", "help wanted", "stale", "sênior"],
  }), {
    areas: ["frontend"],
    technologies: ["nextjs", "react", "typescript"],
    seniority: ["senior"],
    employmentTypes: ["contractor", "full-time"],
    workModels: ["remote"],
    languages: ["en"],
  });
});

test("normalizes Portuguese employment and seniority terms", () => {
  assert.deepEqual(extractStructuredTaxonomy({
    title: "Pessoa Desenvolvedora Backend Pleno",
    body: "Contratação CLT. Trabalho híbrido com Java e Spring.",
    labels: ["aguardando triagem"],
  }), {
    areas: ["backend"],
    technologies: ["java", "spring"],
    seniority: ["mid"],
    employmentTypes: ["employee"],
    workModels: ["hybrid"],
    languages: [],
  });
});

test("mapper preserves raw source tags separately from structured taxonomy", () => {
  const opportunity = mapIssueToOpportunity({
    id: 1,
    number: 10,
    title: "Senior React Frontend Engineer - Remote",
    body: "Full-time role using TypeScript.",
    state: "open",
    labels: [{ name: "frontend" }, { name: "help wanted" }],
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
  }, {
    repository: "community/jobs",
    owner: "community",
    url: "https://github.com/community/jobs",
    country: "Global",
    countryCode: "GLOBAL",
    region: "Global",
  });

  assert.deepEqual(opportunity.sourceTags, ["frontend", "help wanted"]);
  assert.deepEqual(opportunity.taxonomy.areas, ["frontend"]);
  assert.deepEqual(opportunity.taxonomy.technologies, ["react", "typescript"]);
  assert.deepEqual(opportunity.taxonomy.seniority, ["senior"]);
  assert.deepEqual(opportunity.taxonomy.workModels, ["remote"]);
});

