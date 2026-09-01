import { resolve } from "node:path";
import { clampInt } from "../shared/utils/number.mjs";

const DEFAULT_MAX_ISSUES_PER_REPOSITORY = 30;
const DEFAULT_MAX_REPOSITORIES = 0;
const DEFAULT_REQUEST_DELAY_MS = 120;

function parseCountryCodes(rawValue) {
  return String(rawValue ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item, index, all) => item.length > 0 && all.indexOf(item) === index);
}

export function loadBuildConfig() {
  const rootDir = process.cwd();

  return {
    paths: {
      rootDir,
      repositoriesFile: resolve(rootDir, "src", "modules", "catalog", "repositories.json"),
      snapshotRootDir: resolve(rootDir, "snapshots", "opportunities"),
      legacySnapshotFile: resolve(rootDir, "snapshots", "opportunities.json"),
    },
    github: {
      token: process.env.OPENINGS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    },
    observability: {
      dsn: process.env.SENTRY_DSN || "",
      environment: process.env.SENTRY_ENVIRONMENT || "production",
      monitorSlug: process.env.SENTRY_MONITOR_SLUG || "opportunities-sync",
      release: process.env.SENTRY_RELEASE || "unknown",
    },
    filters: {
      countryCodes: parseCountryCodes(process.env.COUNTRY_CODES),
    },
    limits: {
      maxIssuesPerRepository: clampInt(
        process.env.MAX_ISSUES_PER_REPOSITORY,
        DEFAULT_MAX_ISSUES_PER_REPOSITORY,
        1,
        100,
      ),
      maxRepositories: clampInt(process.env.MAX_REPOSITORIES, DEFAULT_MAX_REPOSITORIES, 0, 50000),
      requestDelayMs: clampInt(process.env.REQUEST_DELAY_MS, DEFAULT_REQUEST_DELAY_MS, 0, 10000),
    },
  };
}
