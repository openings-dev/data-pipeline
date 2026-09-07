import assert from "node:assert/strict";
import test from "node:test";

import {
  OPENINGS_PRODUCTION_PUBLISHING_ENDPOINT,
  loadProductionPublishingConfig,
} from "../src/modules/publishing/production-config.mjs";

const validEnvironment = {
  PUBLISHING_ENDPOINT: OPENINGS_PRODUCTION_PUBLISHING_ENDPOINT,
  PUBLISHING_CLIENT_ID: "openings-data-pipeline",
  PUBLISHING_CLIENT_SECRET: "a".repeat(32),
};

test("loads the dedicated production publishing credentials", () => {
  assert.deepEqual(loadProductionPublishingConfig(validEnvironment), {
    endpoint: OPENINGS_PRODUCTION_PUBLISHING_ENDPOINT,
    clientId: "openings-data-pipeline",
    secret: "a".repeat(32),
  });
});

test("fails closed when any production publishing credential is absent", () => {
  for (const name of Object.keys(validEnvironment)) {
    const environment = { ...validEnvironment };
    delete environment[name];
    assert.throws(() => loadProductionPublishingConfig(environment), new RegExp(`${name} is required`, "u"));
  }
});

test("rejects staging, preview, and arbitrary publishing endpoints", () => {
  for (const endpoint of [
    "https://publishing-platform-staging.business-850.workers.dev",
    "https://example.com",
    `${OPENINGS_PRODUCTION_PUBLISHING_ENDPOINT}/unexpected`,
  ]) {
    assert.throws(
      () => loadProductionPublishingConfig({ ...validEnvironment, PUBLISHING_ENDPOINT: endpoint }),
      /must use the approved production Worker/u,
    );
  }
});

test("rejects weak producer secrets", () => {
  assert.throws(
    () => loadProductionPublishingConfig({ ...validEnvironment, PUBLISHING_CLIENT_SECRET: "short" }),
    /at least 24 characters/u,
  );
});
