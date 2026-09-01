import { cleanSentryLabel } from "./sentry-state.mjs";

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const ALLOWED_COUNT_KEYS = new Set([
  "failed",
  "opportunities",
  "repositoriesRequested",
  "repositoriesScanned",
  "successful",
]);

function sanitizeCounts(counts) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return {};

  return Object.fromEntries(
    Object.entries(counts)
      .filter(
        ([key, value]) =>
          ALLOWED_COUNT_KEYS.has(key) && Number.isFinite(value) && Number(value) >= 0,
      )
      .map(([key, value]) => [key, Number(value)]),
  );
}

function sanitizeRepositories(repositories) {
  if (!Array.isArray(repositories)) return [];

  return repositories
    .map((repository) => String(repository ?? "").trim())
    .filter((repository) => REPOSITORY_PATTERN.test(repository))
    .slice(0, 50);
}

export function buildSafePipelineException(config, context = {}) {
  const error = new Error("Pipeline synchronization failed");
  error.name = "PipelineSyncError";

  return {
    error,
    context: {
      extra: {
        counts: sanitizeCounts(context.counts),
        repositories: sanitizeRepositories(context.repositories),
      },
      tags: {
        environment: config.environment,
        outcome: cleanSentryLabel(context.outcome, "error"),
        release: config.release,
      },
    },
  };
}
