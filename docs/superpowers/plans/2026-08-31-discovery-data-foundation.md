# Discovery Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish canonical, structured, freshness-aware opportunities plus a durable public community synchronization status artifact.

**Architecture:** Enrich every source issue conservatively, preserve source facts, group only high-confidence duplicates, then build versioned static artifacts from canonical records. Community status carries prior successful timestamps across failed collection runs and exposes only sanitized public health categories.

**Tech Stack:** Node.js 20+, ECMAScript modules, native `node:test`, generated JSON static API.

---

### Task 1: Structured job location extraction

**Files:**
- Create: `src/modules/opportunities/job-location.mjs`
- Create: `test/job-location.test.mjs`
- Modify: `src/modules/opportunities/opportunity-mapper.mjs`

- [ ] **Step 1: Write failing tests for explicit, remote, and unknown location cases**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { extractJobLocation } from "../src/modules/opportunities/job-location.mjs";

test("extracts explicit Brazilian city and remote model", () => {
  assert.deepEqual(extractJobLocation({
    title: "[Remoto - São Paulo/SP] Backend Engineer",
    body: "Modalidade: remoto dentro do Brasil",
    sourceLocation: { country: "Brazil", countryCode: "BR", region: "South America" },
  }), {
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
    subdivision: "SP",
    city: "São Paulo",
    workModel: "remote",
    remoteScope: "country",
    displayText: "São Paulo, SP · Remote within Brazil",
    confidence: "explicit",
  });
});

test("does not present repository geography as confirmed job geography", () => {
  const result = extractJobLocation({
    title: "Software Engineer",
    body: "Build distributed systems.",
    sourceLocation: { country: "Brazil", countryCode: "BR", region: "South America" },
  });
  assert.deepEqual(result, { confidence: "unknown" });
});
```

- [ ] **Step 2: Run the location test and verify the missing module failure**

Run: `node --test test/job-location.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement conservative deterministic extraction**

```js
export function extractJobLocation({ title, body, sourceLocation, structured = {} }) {
  const text = `${title ?? ""}\n${body ?? ""}`;
  const workModel = detectWorkModel(structured.workModel ?? text);
  const explicit = structured.country || parseLabeledLocation(text) || parseTitleLocation(title);
  if (!explicit && !workModel) return { confidence: "unknown" };
  return buildLocation({ explicit, workModel, sourceLocation, text, structured });
}
```

Use explicit country aliases for the catalog countries, Brazilian subdivision abbreviations, and labeled fields such as `Location`, `Localização`, `Ubicación`, `Lieu`, `Standort`, and `Sede`. Return unknown for ambiguous free prose.

- [ ] **Step 4: Add `sourceLocation` and `jobLocation` in the mapper**

```js
const sourceLocation = {
  country: repository.country,
  countryCode: repository.countryCode,
  region: repository.region,
};

const jobLocation = extractJobLocation({
  title: issue.title,
  body,
  sourceLocation,
});
```

- [ ] **Step 5: Run focused and complete tests**

Run: `node --test test/job-location.test.mjs && npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/opportunities/job-location.mjs src/modules/opportunities/opportunity-mapper.mjs test/job-location.test.mjs
git commit -m "feat: extract explicit job locations"
```

### Task 2: Structured taxonomy

**Files:**
- Create: `src/modules/opportunities/structured-taxonomy.mjs`
- Create: `test/structured-taxonomy.test.mjs`
- Modify: `src/modules/opportunities/opportunity-mapper.mjs`
- Modify: `src/modules/opportunities/tags-extractor.mjs`

- [ ] **Step 1: Write failing taxonomy tests**

```js
test("classifies job facts while excluding operational labels", () => {
  const taxonomy = extractStructuredTaxonomy({
    title: "Senior React Frontend Engineer - Remote",
    body: "Full-time contractor. English C1. TypeScript and Next.js.",
    labels: ["frontend", "help wanted", "stale", "sênior"],
  });
  assert.deepEqual(taxonomy, {
    areas: ["frontend"],
    technologies: ["nextjs", "react", "typescript"],
    seniority: ["senior"],
    employmentTypes: ["contractor", "full-time"],
    workModels: ["remote"],
    languages: ["en"],
  });
});
```

- [ ] **Step 2: Verify failure, then implement alias dictionaries and stable sorting**

Run: `node --test test/structured-taxonomy.test.mjs`

Expected: FAIL before implementation, PASS afterward.

The implementation must read labels, title, and body on every issue; keep `sourceTags` separate; normalize multilingual seniority/work-model terms; and never expose operational labels as structured facets.

- [ ] **Step 3: Update the mapper contract**

```js
const sourceTags = extractTags(issue);
const taxonomy = extractStructuredTaxonomy({
  title: issue.title,
  body,
  labels: sourceTags,
});

return { ...opportunity, tags: sourceTags, sourceTags, taxonomy };
```

- [ ] **Step 4: Run all tests and commit**

Run: `npm test`

```bash
git add src/modules/opportunities/structured-taxonomy.mjs src/modules/opportunities/tags-extractor.mjs src/modules/opportunities/opportunity-mapper.mjs test/structured-taxonomy.test.mjs
git commit -m "feat: publish structured job taxonomy"
```

### Task 3: High-confidence duplicate grouping

**Files:**
- Create: `src/modules/opportunities/opportunity-sources.mjs`
- Create: `src/modules/opportunities/deduplicate-opportunities.mjs`
- Create: `test/deduplicate-opportunities.test.mjs`
- Modify: `src/modules/snapshot/static-api/build-static-api-files.mjs`

- [ ] **Step 1: Write duplicate grouping tests**

Cover same application URL across repositories, normalized title/company/location, identical stable description fingerprints, generic-title non-grouping, oldest primary source, latest update, and source preservation.

```js
const [canonical] = deduplicateOpportunities([newerCopy, original]);
assert.equal(canonical.id, original.id);
assert.equal(canonical.createdAt, original.createdAt);
assert.equal(canonical.updatedAt, newerCopy.updatedAt);
assert.equal(canonical.sources.length, 2);
assert.equal(canonical.deduplication.sourceCount, 2);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test test/deduplicate-opportunities.test.mjs`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement application URL extraction and grouping keys**

```js
export function duplicateKeys(item) {
  return [
    applicationUrlKey(item),
    titleCompanyLocationKey(item),
    titleDescriptionKey(item),
  ].filter(Boolean);
}
```

Exclude GitHub issue URLs and tracking-only URL variations. Generic titles require application/content identity and cannot use the title/company key alone.

- [ ] **Step 4: Build canonical records and call grouping before page/facet generation**

```js
const sourceItems = normalizeOpenSourceItems(countrySnapshots);
const items = deduplicateOpportunities(sourceItems);
```

- [ ] **Step 5: Run duplicate tests, then commit**

Run: `node --test test/deduplicate-opportunities.test.mjs && npm test`

```bash
git add src/modules/opportunities/opportunity-sources.mjs src/modules/opportunities/deduplicate-opportunities.mjs src/modules/snapshot/static-api/build-static-api-files.mjs test/deduplicate-opportunities.test.mjs
git commit -m "feat: group duplicate job sources"
```

### Task 4: Freshness metadata and date filters

**Files:**
- Create: `src/modules/opportunities/opportunity-freshness.mjs`
- Create: `test/opportunity-freshness.test.mjs`
- Modify: `src/modules/opportunities/deduplicate-opportunities.mjs`

- [ ] **Step 1: Write exact boundary tests**

```js
assert.equal(classifyFreshness(createdAt(7), now).status, "fresh");
assert.equal(classifyFreshness(createdAt(30), now).status, "fresh");
assert.equal(classifyFreshness(createdAt(31), now).status, "aging");
assert.equal(classifyFreshness(createdAt(90), now).status, "aging");
assert.equal(classifyFreshness(createdAt(91), now).status, "stale");
```

- [ ] **Step 2: Implement `ageDays`, `status`, and `publishedAt` calculation**

Use the snapshot `generatedAt` as the deterministic reference time, not the local clock during consumer rendering.

- [ ] **Step 3: Attach freshness after canonical grouping**

```js
const canonical = deduplicateOpportunities(sourceItems);
const items = canonical.map((item) => ({
  ...item,
  freshness: classifyFreshness(item.createdAt, generatedAt),
}));
```

- [ ] **Step 4: Run tests and commit**

Run: `node --test test/opportunity-freshness.test.mjs && npm test`

```bash
git add src/modules/opportunities/opportunity-freshness.mjs src/modules/opportunities/deduplicate-opportunities.mjs test/opportunity-freshness.test.mjs
git commit -m "feat: classify opportunity freshness"
```

### Task 5: Structured facets, weighted search data, and aliases

**Files:**
- Create: `src/modules/snapshot/static-api/aliases.mjs`
- Modify: `src/modules/snapshot/static-api/facet-index.mjs`
- Modify: `src/modules/snapshot/static-api/search-text.mjs`
- Modify: `src/modules/snapshot/static-api/paths.mjs`
- Modify: `src/modules/snapshot/static-api/manifest.mjs`
- Modify: `src/modules/snapshot/static-api/build-static-api-files.mjs`
- Create: `test/discovery-static-api.test.mjs`

- [ ] **Step 1: Write a static artifact contract test**

Assert schema version, structured dimensions, weighted search fields, prior source ID aliases, canonical counts, and files for aliases/status.

```js
assert.equal(manifest.schemaVersion, 6);
assert.deepEqual(facets.dimensions.workModels.remote, [canonical.id]);
assert.equal(search.items[0].fields.title, "senior react engineer");
assert.equal(aliases.ids[sourceCopy.id], canonical.id);
```

- [ ] **Step 2: Verify the contract test fails**

Run: `node --test test/discovery-static-api.test.mjs`

- [ ] **Step 3: Extend facet dimensions**

Publish `jobCountries`, `jobRegions`, `workModels`, `areas`, `technologies`, `seniority`, `employmentTypes`, `languages`, `freshness`, and `salaryDisclosed`. Preserve legacy dimensions during migration.

- [ ] **Step 4: Publish weighted search fields**

```js
{
  id,
  fields: {
    title,
    company,
    taxonomy,
    location,
    excerpt,
    source
  }
}
```

- [ ] **Step 5: Publish aliases and schema version 6, run tests, and commit**

Run: `node --test test/discovery-static-api.test.mjs && npm test`

```bash
git add src/modules/snapshot/static-api test/discovery-static-api.test.mjs
git commit -m "feat: publish structured discovery artifacts"
```

### Task 6: Durable community synchronization status

**Files:**
- Create: `src/modules/snapshot/static-api/community-status.mjs`
- Create: `test/community-status.test.mjs`
- Modify: `src/modules/snapshot/static-api/paths.mjs`
- Modify: `src/modules/snapshot/static-api/build-static-api-files.mjs`
- Modify: `src/modules/snapshot/static-api/manifest.mjs`
- Modify: `src/modules/snapshot/prepare-segmented-snapshot.mjs`
- Modify: `src/app/run-build.mjs`

- [ ] **Step 1: Write carry-forward and public-safety tests**

```js
const status = buildCommunityStatus({
  generatedAt: "2026-08-31T12:00:00.000Z",
  repositories,
  canonicalItems,
  failedRepositories: [{ repository: "owner/jobs", error: "token=secret timeout" }],
  previousStatus,
});
assert.equal(status.items[0].status, "error");
assert.equal(status.items[0].lastSuccessfulSyncAt, "2026-08-30T12:00:00.000Z");
assert.equal(JSON.stringify(status).includes("secret"), false);
```

- [ ] **Step 2: Implement status derivation**

Successful repositories receive the current `generatedAt`. Failed repositories carry prior success or `null`. Successful repositories with zero canonical open jobs use `no-openings`; other successful repositories use `healthy`.

- [ ] **Step 3: Load the prior status artifact before building**

Read `snapshots/opportunities/api/status.json` with the existing safe JSON storage helper. Missing or invalid prior status is treated as empty history.

- [ ] **Step 4: Publish status and manifest reference**

Add `files.status` and global summary totals. Do not put raw error messages in the public artifact.

- [ ] **Step 5: Run tests and commit**

Run: `node --test test/community-status.test.mjs test/discovery-static-api.test.mjs && npm test`

```bash
git add src/app/run-build.mjs src/modules/snapshot test/community-status.test.mjs
git commit -m "feat: publish community sync status"
```

### Task 7: Validation and snapshot publication

**Files:**
- Modify: `src/modules/validation/validate-snapshot-structure.mjs`
- Modify: `test/static-api-communities.test.mjs`
- Modify: `README.md`
- Generated: `snapshots/opportunities/**`

- [ ] **Step 1: Add validation assertions for schema 6 and every new artifact**

Validation must reject unknown enum values, dangling aliases, source counts that disagree with `sources`, status rows missing catalog communities, and noncanonical IDs in facet dimensions.

- [ ] **Step 2: Run the full validator before regenerating**

Run: `npm run validate`

Expected: FAIL only because the checked-in snapshot still uses the prior schema.

- [ ] **Step 3: Regenerate the checked-in snapshot using existing public data inputs**

Run: `npm run build:snapshot`

Expected: structured schema 6 artifacts and `api/status.json` are written.

- [ ] **Step 4: Run complete validation**

Run: `npm run validate`

Expected: PASS with zero test or snapshot validation failures.

- [ ] **Step 5: Commit**

```bash
git add README.md src/modules/validation test snapshots/opportunities
git commit -m "chore(data): publish structured discovery snapshot"
```
