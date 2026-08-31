import assert from "node:assert/strict";
import test from "node:test";

import { mapIssueToOpportunity } from "../src/modules/opportunities/opportunity-mapper.mjs";

const sponsoredRepository = {
  repository: "openings-dev/jobs",
  owner: "openings-dev",
  name: "jobs",
  url: "https://github.com/openings-dev/jobs",
  country: "Global",
  countryCode: "GLOBAL",
  region: "Global",
  issueMetadataFormat: "openings-sponsored-job-v1",
  promotionType: "sponsored",
};

const sponsoredIssueBody = `### Job title

Senior Frontend Engineer

### Company

Acme

### Country

Brazil

### Region

South America

### Location details

Remote in Brazil

### Work model

Remote

### Seniority

Senior

### Stack

React, TypeScript, Node.js

### Salary or compensation

BRL 18,000–22,000 per month

### Job description

Build accessible product experiences with the platform team.

### How to apply

Apply at https://example.com/jobs/123

### Public submission and sponsored placement terms

- [x] I agree`;

function createIssue(overrides = {}) {
  return {
    id: 101,
    number: 12,
    title: "[Ad request]: Senior Frontend Engineer",
    body: sponsoredIssueBody,
    state: "open",
    html_url: "https://github.com/openings-dev/jobs/issues/12",
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    labels: [{ name: "sponsored" }, { name: "frontend" }],
    user: {
      login: "acme-jobs",
      avatar_url: "https://github.com/acme-jobs.png",
    },
    ...overrides,
  };
}

test("sponsored mapping uses structured job data and explicit promotion", () => {
  const opportunity = mapIssueToOpportunity(
    createIssue(),
    sponsoredRepository,
  );

  assert.equal(opportunity.title, "Senior Frontend Engineer");
  assert.equal(opportunity.companyName, "Acme");
  assert.equal(opportunity.country, "Brazil");
  assert.equal(opportunity.region, "South America");
  assert.deepEqual(opportunity.promotion, { type: "sponsored" });
  assert.deepEqual(opportunity.tags, [
    "frontend",
    "Remote",
    "Senior",
    "React",
    "TypeScript",
    "Node.js",
  ]);
  assert.match(opportunity.description, /### Location details\n\nRemote in Brazil/);
  assert.match(opportunity.description, /### How to apply\n\nApply at https:\/\/example.com\/jobs\/123/);
  assert.doesNotMatch(opportunity.description, /Public submission/);
});

test("missing structured values fall back without inventing promotion data", () => {
  const ordinaryRepository = {
    ...sponsoredRepository,
    repository: "community/jobs",
    owner: "community",
    url: "https://github.com/community/jobs",
    country: "Portugal",
    region: "Europe",
  };
  delete ordinaryRepository.issueMetadataFormat;
  delete ordinaryRepository.promotionType;
  const issue = createIssue({
    title: "Backend Engineer",
    body: "Ordinary public job description",
    labels: [{ name: "backend" }],
  });

  const opportunity = mapIssueToOpportunity(issue, ordinaryRepository);

  assert.equal(opportunity.title, "Backend Engineer");
  assert.equal(opportunity.country, "Portugal");
  assert.equal(opportunity.region, "Europe");
  assert.equal(opportunity.promotion, undefined);
  assert.deepEqual(opportunity.tags, ["backend"]);
});
