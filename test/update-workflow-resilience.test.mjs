import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("snapshot workflow retries transient GitHub push failures", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/update-opportunities.yml", import.meta.url),
    "utf8",
  );
  const commitStep = workflow.match(
    /- name: Commit and push snapshot(?<block>[\s\S]*)/u,
  )?.groups?.block ?? "";

  assert.match(commitStep, /for push_attempt in 1 2 3; do/u);
  assert.match(commitStep, /if git push; then/u);
  assert.match(commitStep, /sleep "\$\(\(push_attempt \* 5\)\)"/u);
  assert.doesNotMatch(commitStep, /^\s*git push\s*$/mu);
});
