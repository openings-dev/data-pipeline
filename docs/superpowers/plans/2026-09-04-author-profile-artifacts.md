# Author Profile Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve each author profile from one small static JSON artifact instead of aggregating the complete opportunity snapshot in the browser.

**Architecture:** The data pipeline derives `UserSummary`-compatible records from the same deduplicated open opportunities used by the static API and writes one encoded JSON path per active author. The web client fetches and validates that direct artifact, while server-side export code retains its existing snapshot aggregation during migration.

**Tech Stack:** Node.js ESM, Node test runner, TypeScript, Next.js static export, GitHub Actions.

---

### Task 1: Build per-author artifacts in the data pipeline

**Files:**
- Create: `src/modules/snapshot/static-api/authors.mjs`
- Modify: `src/modules/snapshot/static-api/paths.mjs`
- Modify: `src/modules/snapshot/static-api/build-static-api-files.mjs`
- Test: `test/static-api-authors.test.mjs`

- [ ] **Step 1: Write the failing author artifact tests**

Cover normalized handles, counts, most-frequent location, latest post, encoded
file names, closed-item exclusion, deterministic ordering, and the 32 KiB
payload limit. Assert a file such as `api/authors/alice.json` contains
`schemaVersion`, `generatedAt`, and the expected author summary.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/static-api-authors.test.mjs`
Expected: fail because `authors.mjs` does not exist.

- [ ] **Step 3: Implement the minimal artifact builder**

Export `buildAuthorArtifacts(items, generatedAt)` and
`staticApiAuthorPath(handle)`. Derive summaries only from open items, encode the
normalized handle, sort by relative path, serialize to enforce 32 KiB, and
return `{ file, payload, bytes }` records.

- [ ] **Step 4: Integrate artifacts into the static API file list**

Map every author artifact through `toFile` in `buildStaticApiFiles`. Extend the
manifest with `authors: { count, bytes }` without duplicating job bodies.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/static-api-authors.test.mjs && npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/snapshot/static-api test/static-api-authors.test.mjs
git commit -m "feat(data): publish per-author profiles"
```

### Task 2: Prove stale author artifacts are removed

**Files:**
- Modify: `test/write-json-if-changed.test.mjs`
- Modify: `src/modules/snapshot/collect-previous-snapshot-files.mjs` only if the existing global static file list does not already cover author artifacts

- [ ] **Step 1: Add a failing stale-file test**

Create a previous snapshot referencing `api/authors/retired.json`, build the
next snapshot without that author, and assert the retired file is removed and
reported in `changedFiles`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/write-json-if-changed.test.mjs`
Expected: the stale author artifact remains.

- [ ] **Step 3: Implement minimal stale-file tracking**

Ensure every generated author path is included in the global index
`staticApi.files`, allowing the existing previous/next file reconciliation to
remove only obsolete artifacts.

- [ ] **Step 4: Verify and commit**

Run: `node --test test/write-json-if-changed.test.mjs && npm run validate`
Expected: all checks pass.

```bash
git add src/modules/snapshot test/write-json-if-changed.test.mjs
git commit -m "test(data): prune retired author profiles"
```

### Task 3: Fetch direct author artifacts in the website

**Files:**
- Create: `lib/opportunities/author-artifact.ts`
- Create: `lib/opportunities/author-artifact.test.ts`
- Modify: `app/entity/author/client-author-page.tsx`
- Modify: `tooling/validate-client-job-route.mjs`

- [ ] **Step 1: Write failing parser and URL tests**

Test valid payload parsing, invalid schema rejection, oversized/empty identity
rejection, normalized encoded URLs, and null for HTTP 404. The public function
is `fetchAuthorArtifact(handle): Promise<UserSummary | null>`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- lib/opportunities/author-artifact.test.ts`
Expected: fail because the module does not exist.

- [ ] **Step 3: Implement the direct fetch boundary**

Build the URL with `openingsDataUrl`, fetch only
`api/authors/{encoded-handle}.json`, enforce schema version 1 and all
`UserSummary` fields, return null on 404, and throw on malformed responses.

- [ ] **Step 4: Switch only the client entity shell**

Replace `getSnapshotUserByHandle` with `fetchAuthorArtifact` in
`ClientAuthorPage`. Keep static-export pages and author listings unchanged.
Update the source contract validation to forbid the full-snapshot helper in the
client shell.

- [ ] **Step 5: Verify and commit on `cloudflare-preview`**

Run: `npm test && npm run lint && npm run build:cloudflare-preview`
Expected: all checks pass and the Pages package remains below 2,000 files.

```bash
git add app/entity/author lib/opportunities tooling/validate-client-job-route.mjs
git commit -m "perf: fetch direct author profiles"
```

### Task 4: Publish data and validate the preview

**Files:**
- Generated: `snapshots/opportunities/api/authors/*.json`
- Generated: static API manifest and global snapshot index

- [ ] **Step 1: Rebuild the current static API**

Run: `npm run rebuild:static-api`
Expected: author files are created and included in the snapshot file inventory.

- [ ] **Step 2: Validate and commit the generated data**

Run: `npm run validate`
Expected: all checks pass and no author artifact exceeds 32 KiB.

Commit generated changes separately with:

```bash
git add snapshots/opportunities
git commit -m "chore(data): publish author profile artifacts"
```

- [ ] **Step 3: Push data, then push the website preview**

Push `data-pipeline/main` first so the new client never requests unavailable
artifacts. Push `web/cloudflare-preview` only after the raw JSON is reachable.

- [ ] **Step 4: Verify the deployed route and network behavior**

Open a known `/authors/{handle}` and `/users/{handle}` in the preview. Confirm
the profile renders, the direct author request succeeds, and no country or
repository snapshot shard is requested to construct the profile header.

- [ ] **Step 5: Record acceptance**

Update the route design documentation with measured artifact count, bytes, and
observed author load behavior. Production DNS and Hostinger remain unchanged.
