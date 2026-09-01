import assert from "node:assert/strict";
import test from "node:test";

import { deduplicateOpportunities } from "../src/modules/opportunities/deduplicate-opportunities.mjs";

function opportunity(overrides = {}) {
  return {
    id: "job-a",
    sourceId: "community/a#1",
    title: "Senior React Engineer",
    description: "Apply at https://jobs.example.com/react?utm_source=community-a",
    excerpt: "Build React products",
    contentHash: "hash-a",
    issueState: "open",
    repository: "community/a",
    repositoryUrl: "https://github.com/community/a",
    country: "Brazil",
    region: "South America",
    sourceLocation: { country: "Brazil", countryCode: "BR", region: "South America" },
    jobLocation: { country: "Brazil", countryCode: "BR", region: "South America", confidence: "explicit" },
    tags: ["react"],
    sourceTags: ["react"],
    taxonomy: { areas: ["frontend"], technologies: ["react"], seniority: ["senior"], employmentTypes: [], workModels: ["remote"], languages: [] },
    author: { id: "a", name: "A", handle: "a", avatarUrl: "" },
    community: { id: "a", name: "A", avatarUrl: "", repository: "community/a", url: "https://github.com/community/a" },
    companyName: "Acme",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    url: "https://github.com/community/a/issues/1",
    sourceType: "github-issue",
    ...overrides,
  };
}

test("groups the same application URL and keeps the oldest open source primary", () => {
  const original = opportunity();
  const newerCopy = opportunity({
    id: "job-b",
    sourceId: "community/b#2",
    repository: "community/b",
    repositoryUrl: "https://github.com/community/b",
    url: "https://github.com/community/b/issues/2",
    description: "Apply: https://jobs.example.com/react?utm_source=community-b",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
  });

  const [canonical] = deduplicateOpportunities([newerCopy, original]);

  assert.equal(canonical.id, original.id);
  assert.equal(canonical.repository, original.repository);
  assert.equal(canonical.createdAt, original.createdAt);
  assert.equal(canonical.updatedAt, newerCopy.updatedAt);
  assert.equal(canonical.sources.length, 2);
  assert.deepEqual(canonical.deduplication, { sourceCount: 2 });
});

test("does not group different roles that only share a company homepage", () => {
  const first = opportunity({
    id: "frontend-role",
    title: "Frontend Engineer",
    description: "About https://example.com and the frontend opening.",
  });
  const second = opportunity({
    id: "backend-role",
    sourceId: "community/b#2",
    title: "Backend Engineer",
    description: "About https://example.com and the backend opening.",
  });

  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("does not group different roles that only share a generic careers page", () => {
  const first = opportunity({
    id: "frontend-role",
    title: "Frontend Engineer",
    description: "See https://example.com/careers for the frontend opening.",
  });
  const second = opportunity({
    id: "backend-role",
    sourceId: "community/b#2",
    title: "Backend Engineer",
    description: "See https://example.com/careers for the backend opening.",
  });

  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("does not treat a shared external article as an application URL", () => {
  const article = "https://news.example.com/content/ac773779-98ba-442d-a1f2-a14f1a67ddfe";
  const first = opportunity({
    id: "java-role",
    title: "Java Engineer",
    description: `Company background: ${article}. Apply in the issue.`,
  });
  const second = opportunity({
    id: "python-role",
    sourceId: "community/b#2",
    title: "Python Engineer",
    description: `Company background: ${article}. Apply in the issue.`,
  });

  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("does not treat shared GitHub documentation as an application URL", () => {
  const guide = "https://github.com/community/jobs/blob/main/README.md#posting-rules";
  const first = opportunity({
    id: "design-role",
    title: "Product Designer",
    description: `Read ${guide} before applying.`,
  });
  const second = opportunity({
    id: "data-role",
    sourceId: "community/b#2",
    title: "Data Engineer",
    description: `Read ${guide} before applying.`,
  });

  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("does not treat content on a careers host as an application URL", () => {
  const article = "https://careers.example.com/blog/engineering-culture";
  const first = opportunity({
    id: "platform-role",
    title: "Platform Engineer",
    description: `Learn about us at ${article}.`,
  });
  const second = opportunity({
    id: "mobile-role",
    sourceId: "community/b#2",
    title: "Mobile Engineer",
    description: `Learn about us at ${article}.`,
  });

  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("does not treat content nested under a careers path as an application URL", () => {
  const article = "https://example.com/careers/blog/engineering-culture";
  const first = opportunity({
    id: "security-role",
    title: "Security Engineer",
    description: `Company story: ${article}.`,
  });
  const second = opportunity({
    id: "qa-role",
    sourceId: "community/b#2",
    title: "QA Engineer",
    description: `Company story: ${article}.`,
  });

  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("does not treat GitHub aliases as application URLs", () => {
  const guide = "https://www.github.com/community/jobs/blob/main/README.md";
  const first = opportunity({
    id: "support-role",
    title: "Support Engineer",
    description: `Read ${guide} before applying.`,
  });
  const second = opportunity({
    id: "sre-role",
    sourceId: "community/b#2",
    title: "Site Reliability Engineer",
    description: `Read ${guide} before applying.`,
  });

  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("groups an exact normalized title, company, and location", () => {
  const copy = opportunity({
    id: "job-copy",
    sourceId: "community/c#3",
    repository: "community/c",
    url: "https://github.com/community/c/issues/3",
    description: "Different application instructions",
  });
  assert.equal(deduplicateOpportunities([opportunity(), copy]).length, 1);
});

test("does not group generic feed titles without matching content or application URL", () => {
  const first = opportunity({ id: "one", title: "New Internship", companyName: undefined, description: "Company One role", contentHash: "one" });
  const second = opportunity({ id: "two", title: "New Internship", companyName: undefined, description: "Company Two role", contentHash: "two" });
  assert.equal(deduplicateOpportunities([first, second]).length, 2);
});

test("groups stable normalized title and description content", () => {
  const first = opportunity({ description: "Build APIs with Node.js", companyName: undefined });
  const second = opportunity({ id: "copy", sourceId: "community/b#4", repository: "community/b", description: "  Build APIs   with Node.js  ", companyName: undefined });
  assert.equal(deduplicateOpportunities([first, second]).length, 1);
});
