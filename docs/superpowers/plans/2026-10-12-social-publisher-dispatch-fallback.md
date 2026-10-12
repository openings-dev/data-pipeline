# Social Publisher Dispatch Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the data pipeline successful when its optional immediate notification to the social publisher cannot authenticate.

**Architecture:** Preserve the existing repository-dispatch fast path and its narrowly scoped credential. Handle a failed dispatch inside the notification step, emit a visible warning, and rely on the social publisher's existing scheduled intake as the durable fallback.

**Tech Stack:** GitHub Actions YAML, Bash, Node.js built-in test runner

---

### Task 1: Make the optional dispatch fail open

**Files:**
- Modify: `test/social-publisher-dispatch.test.mjs`
- Modify: `.github/workflows/update-opportunities.yml`

- [ ] **Step 1: Write the failing workflow contract test**

Extend the first dispatch test with these assertions:

```js
assert.match(dispatch, /if ! jq -n[\s\S]*\| gh api[\s\S]*; then/u);
assert.match(dispatch, /::warning::Social publisher notification failed; scheduled intake will process the committed snapshot\./u);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test test/social-publisher-dispatch.test.mjs
```

Expected: the dispatch behavior test fails because the workflow does not yet catch the failed notification.

- [ ] **Step 3: Handle the optional dispatch failure**

Wrap the existing `jq | gh api` pipeline in `.github/workflows/update-opportunities.yml` with:

```bash
if ! jq -n \
  --arg source_commit "$SOURCE_COMMIT" \
  --arg previous_commit "$PREVIOUS_COMMIT" \
  --arg data_hash "$DATA_HASH" \
  '{
    event_type: "openings_source_committed_v1",
    client_payload: {
      schema_version: 1,
      source_repository: "openings-dev/data-pipeline",
      source_commit: $source_commit,
      previous_commit: $previous_commit,
      data_hash: $data_hash,
      event_id: ("openings:data:" + $source_commit)
    }
  }' | gh api --method POST repos/openings-dev/social-publisher/dispatches --input -; then
  echo "::warning::Social publisher notification failed; scheduled intake will process the committed snapshot."
fi
```

- [ ] **Step 4: Run focused and full validation**

Run:

```bash
node --test test/social-publisher-dispatch.test.mjs
npm run validate
```

Expected: both commands pass with zero failures.

- [ ] **Step 5: Commit the implementation**

```bash
git add test/social-publisher-dispatch.test.mjs .github/workflows/update-opportunities.yml
git commit -m "fix: tolerate expired social dispatch credential"
```

### Task 2: Publish and verify production behavior

**Files:**
- No file changes

- [ ] **Step 1: Push the implementation branch and merge it into `main` through the repository's normal review path**

Expected: `main` contains the tested workflow change.

- [ ] **Step 2: Trigger `Update Opportunities Snapshot` manually**

Expected: snapshot work completes; an HTTP 401 from the expired dispatch credential appears only as a warning; the workflow conclusion is success.

- [ ] **Step 3: Verify the social publisher remains healthy**

Expected: the newest scheduled social publisher executions conclude successfully and continue consuming committed snapshots without duplicate publications.
