import { runBuild } from "../src/app/run-build.mjs";
import { loadBuildConfig } from "../src/config/env.mjs";
import {
  initializePipelineSentry,
  runMonitoredPipeline,
} from "../src/modules/observability/sentry.mjs";
import { RateLimitError } from "../src/shared/errors/rate-limit-error.mjs";

try {
  initializePipelineSentry(loadBuildConfig().observability);
  await runMonitoredPipeline(runBuild);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error(error.message);

    if (error.resetAt) {
      console.error(`Rate limit resets at: ${error.resetAt}`);
    }

    if (typeof error.retryAfterSeconds === "number") {
      console.error(`Retry after seconds: ${error.retryAfterSeconds}`);
    }

    process.exit(1);
  }

  console.error(error);
  process.exit(1);
}
