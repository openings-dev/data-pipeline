import * as Sentry from "@sentry/node";
import { buildSafePipelineException } from "./sentry-context.mjs";
import {
  cleanSentryLabel,
  resetSentryState,
  safelyInvokeSentry,
  sentryState,
} from "./sentry-state.mjs";

const FLUSH_TIMEOUT_MS = 2_000;

export function initializePipelineSentry(config = {}, sdk = Sentry) {
  resetSentryState();
  const dsn = String(config.dsn ?? "").trim();
  if (!dsn) return false;

  sentryState.config = {
    dsn,
    environment: cleanSentryLabel(config.environment, "production"),
    monitorSlug: cleanSentryLabel(config.monitorSlug, "opportunities-sync"),
    release: cleanSentryLabel(config.release, "unknown"),
  };
  sentryState.sdk = sdk;

  const initialized = safelyInvokeSentry(() => {
    sdk.init({
      dsn: sentryState.config.dsn,
      environment: sentryState.config.environment,
      release: sentryState.config.release,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
    return true;
  }, false);

  if (!initialized) resetSentryState();
  return initialized;
}

export function capturePipelineException(_error, context = {}) {
  if (!sentryState.sdk || !sentryState.config) return null;

  const report = buildSafePipelineException(sentryState.config, context);
  safelyInvokeSentry(() => sentryState.sdk.captureException(report.error, report.context));
  return report.error;
}

export async function flushPipelineSentry() {
  if (!sentryState.sdk) return false;

  try {
    return await sentryState.sdk.flush(FLUSH_TIMEOUT_MS);
  } catch {
    return false;
  }
}
