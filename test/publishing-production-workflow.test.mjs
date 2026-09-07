import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("scheduled publishing is explicitly gated and uses production-only credentials", async () => {
  const workflow = await read(".github/workflows/update-opportunities.yml");
  assert.match(workflow, /if: vars\.PUBLISHING_PRODUCTION_ENABLED == 'true'/u);
  assert.match(workflow, /PUBLISHING_ENDPOINT: \$\{\{ secrets\.PUBLISHING_ENDPOINT \}\}/u);
  assert.match(workflow, /run: npm run publish:production/u);
  assert.doesNotMatch(workflow, /PUBLISHING_SHADOW_ENDPOINT|publish:shadow/u);
});

test("the production smoke test is manual, protected, and cannot target staging", async () => {
  const [workflow, script] = await Promise.all([
    read(".github/workflows/smoke-publishing-production.yml"),
    read("scripts/smoke-publishing-production.mjs"),
  ]);
  assert.match(workflow, /workflow_dispatch/u);
  assert.match(workflow, /environment: production/u);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/u);
  assert.match(workflow, /PUBLISHING_ENDPOINT: \$\{\{ secrets\.PUBLISHING_ENDPOINT \}\}/u);
  assert.doesNotMatch(workflow, /schedule:|PUBLISHING_SHADOW_ENDPOINT/u);
  assert.match(script, /loadProductionPublishingConfig/u);
  assert.doesNotMatch(script, /publishing-platform-staging|PUBLISHING_SHADOW_ENDPOINT/u);
});
