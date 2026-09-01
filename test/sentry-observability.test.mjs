import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  capturePipelineException,
  finishSyncCheckIn,
  flushPipelineSentry,
  initializePipelineSentry,
  runMonitoredPipeline,
  startSyncCheckIn,
} from "../src/modules/observability/sentry.mjs";

function createFakeSentry() {
  const calls = {
    captures: [],
    checkIns: [],
    flushes: [],
    init: [],
  };

  return {
    calls,
    sdk: {
      captureCheckIn(checkIn, monitorConfig) {
        calls.checkIns.push({ checkIn, monitorConfig });
        return "check-in-123";
      },
      captureException(error, context) {
        calls.captures.push({ error, context });
      },
      flush(timeout) {
        calls.flushes.push(timeout);
        return Promise.resolve(true);
      },
      init(options) {
        calls.init.push(options);
      },
    },
  };
}

const enabledConfig = {
  dsn: "https://public@example.invalid/1",
  environment: "production",
  monitorSlug: "opportunities-sync",
  release: "commit-abc",
};

test("stays disabled when the Sentry DSN is absent", async () => {
  const fake = createFakeSentry();

  initializePipelineSentry({ ...enabledConfig, dsn: "" }, fake.sdk);
  startSyncCheckIn();
  finishSyncCheckIn("ok");
  capturePipelineException(new Error("must not be sent"));
  await flushPipelineSentry();

  assert.deepEqual(fake.calls, {
    captures: [],
    checkIns: [],
    flushes: [],
    init: [],
  });
});

test("initializes without personal data or performance tracing", () => {
  const fake = createFakeSentry();

  initializePipelineSentry(enabledConfig, fake.sdk);

  assert.deepEqual(fake.calls.init, [
    {
      dsn: enabledConfig.dsn,
      environment: "production",
      release: "commit-abc",
      sendDefaultPii: false,
      tracesSampleRate: 0,
    },
  ]);
});

test("uses one check-in id from start through completion", () => {
  const fake = createFakeSentry();
  initializePipelineSentry(enabledConfig, fake.sdk);

  assert.equal(startSyncCheckIn(), "check-in-123");
  finishSyncCheckIn("error");

  assert.deepEqual(fake.calls.checkIns[0], {
    checkIn: {
      monitorSlug: "opportunities-sync",
      status: "in_progress",
    },
    monitorConfig: {
      checkinMargin: 30,
      failureIssueThreshold: 1,
      maxRuntime: 25,
      recoveryThreshold: 1,
      schedule: { type: "crontab", value: "0 */3 * * *" },
      timezone: "UTC",
    },
  });
  assert.equal(fake.calls.checkIns[1].checkIn.checkInId, "check-in-123");
  assert.equal(fake.calls.checkIns[1].checkIn.monitorSlug, "opportunities-sync");
  assert.equal(fake.calls.checkIns[1].checkIn.status, "error");
  assert.equal(typeof fake.calls.checkIns[1].checkIn.duration, "number");
});

test("keeps exception context to repository ids, counts, outcome, environment, and release", () => {
  const fake = createFakeSentry();
  initializePipelineSentry(enabledConfig, fake.sdk);

  capturePipelineException(new Error("secret token in raw provider response"), {
    counts: { failed: 2, successful: 40, unsafe: "secret" },
    error: "secret raw error",
    headers: { authorization: "Bearer secret" },
    outcome: "partial",
    repositories: ["org/repo", "bad repository", "org/another-repo"],
  });

  assert.equal(fake.calls.captures.length, 1);
  assert.equal(fake.calls.captures[0].error.message, "Pipeline synchronization failed");
  assert.deepEqual(fake.calls.captures[0].context, {
    extra: {
      counts: { failed: 2, successful: 40 },
      repositories: ["org/repo", "org/another-repo"],
    },
    tags: {
      environment: "production",
      outcome: "partial",
      release: "commit-abc",
    },
  });
  assert.equal(JSON.stringify(fake.calls.captures[0]).includes("secret"), false);
});

test("flushes for at most two seconds", async () => {
  const fake = createFakeSentry();
  initializePipelineSentry(enabledConfig, fake.sdk);

  await flushPipelineSentry();

  assert.deepEqual(fake.calls.flushes, [2000]);
});

test("captures, finishes, flushes, and rethrows the original pipeline failure", async () => {
  const fake = createFakeSentry();
  const failure = new Error("private failure detail");
  initializePipelineSentry(enabledConfig, fake.sdk);

  await assert.rejects(
    () =>
      runMonitoredPipeline(async () => {
        throw failure;
      }),
    (error) => error === failure,
  );

  assert.equal(fake.calls.captures.length, 1);
  assert.equal(fake.calls.checkIns.at(-1).checkIn.status, "error");
  assert.deepEqual(fake.calls.flushes, [2000]);
});

test("provides the production Sentry monitor settings to the scheduled workflow", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/update-opportunities.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /SENTRY_DSN:\s*\$\{\{ secrets\.SENTRY_DSN \}\}/u);
  assert.match(workflow, /SENTRY_ENVIRONMENT:\s*production/u);
  assert.match(workflow, /SENTRY_MONITOR_SLUG:\s*opportunities-sync/u);
  assert.match(workflow, /SENTRY_RELEASE:\s*\$\{\{ github\.sha \}\}/u);
});
