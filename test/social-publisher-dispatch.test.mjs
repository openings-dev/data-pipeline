import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/update-opportunities.yml", import.meta.url),
  "utf8",
);

function step(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return workflow.match(new RegExp(
    `^      - name: ${escaped}(?<block>[\\s\\S]*?)(?=^      - name:|(?![\\s\\S]))`,
    "mu",
  ))?.groups?.block ?? "";
}

test("dispatches an exact source event only after a changed snapshot was pushed", () => {
  const commit = step("Commit and push snapshot");
  const dispatch = step("Notify social publisher after successful push");

  assert.match(commit, /^        id: snapshot$/mu);
  assert.match(commit, /changed=false/u);
  assert.match(commit, /previous_commit="\$\(git rev-parse HEAD\)"/u);
  assert.match(commit, /source_commit="\$\(git rev-parse HEAD\)"/u);
  assert.match(commit, /dataHash/u);
  assert.match(commit, /if git push; then[\s\S]*changed=true/u);

  assert.match(dispatch, /^        if: steps\.snapshot\.outputs\.changed == 'true'$/mu);
  assert.match(dispatch, /GH_TOKEN: \$\{\{ secrets\.SOCIAL_PUBLISHER_DISPATCH_TOKEN \}\}/u);
  assert.match(dispatch, /repos\/openings-dev\/social-publisher\/dispatches/u);
  for (const field of ["schema_version", "source_repository", "source_commit", "previous_commit", "data_hash", "event_id"]) {
    assert.match(dispatch, new RegExp(`\\b${field}\\b`, "u"));
  }
  assert.match(dispatch, /openings_source_committed_v1/u);
  assert.doesNotMatch(commit, /dispatches|SOCIAL_PUBLISHER_DISPATCH_TOKEN/u);
});

test("the dispatch credential is scoped to the dispatch step", () => {
  assert.equal([...workflow.matchAll(/secrets\.SOCIAL_PUBLISHER_DISPATCH_TOKEN/gu)].length, 1);
  assert.doesNotMatch(workflow.match(/^    env:\n(?<block>[\s\S]*?)(?=^    steps:)/mu)?.groups?.block ?? "", /SOCIAL_PUBLISHER_DISPATCH_TOKEN/u);
});
