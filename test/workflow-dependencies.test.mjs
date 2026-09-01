import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const WORKFLOWS = [
  ".github/workflows/validate.yml",
  ".github/workflows/update-opportunities.yml",
  ".github/workflows/discover-communities.yml",
];

test("Node.js workflows install locked dependencies before running project scripts", async () => {
  for (const workflowPath of WORKFLOWS) {
    const workflow = await readFile(workflowPath, "utf8");
    const installIndex = workflow.indexOf("run: npm ci");
    const firstProjectCommandIndex = Math.min(
      ...[workflow.indexOf("run: npm run"), workflow.indexOf("run: node scripts/")].filter(
        (index) => index >= 0,
      ),
    );

    assert.notEqual(installIndex, -1, `${workflowPath} must run npm ci`);
    assert.ok(
      installIndex < firstProjectCommandIndex,
      `${workflowPath} must install dependencies before project commands`,
    );
  }
});
