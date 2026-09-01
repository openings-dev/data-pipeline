import {
  capturePipelineException,
  flushPipelineSentry,
} from "./sentry-client.mjs";
import { safelyInvokeSentry, sentryState } from "./sentry-state.mjs";

const MONITOR_CONFIG = {
  schedule: { type: "crontab", value: "0 */3 * * *" },
  checkinMargin: 30,
  maxRuntime: 25,
  timezone: "UTC",
  failureIssueThreshold: 1,
  recoveryThreshold: 1,
};

export function startSyncCheckIn() {
  if (!sentryState.sdk || !sentryState.config) return null;

  sentryState.checkInStartedAt = Date.now();
  sentryState.checkInId = safelyInvokeSentry(
    () =>
      sentryState.sdk.captureCheckIn(
        {
          monitorSlug: sentryState.config.monitorSlug,
          status: "in_progress",
        },
        MONITOR_CONFIG,
      ),
    null,
  );
  return sentryState.checkInId;
}

export function finishSyncCheckIn(status) {
  if (!sentryState.sdk || !sentryState.config || !sentryState.checkInId) return null;

  const finishedCheckIn = {
    checkInId: sentryState.checkInId,
    duration: Math.max(0, (Date.now() - sentryState.checkInStartedAt) / 1_000),
    monitorSlug: sentryState.config.monitorSlug,
    status: status === "ok" ? "ok" : "error",
  };
  safelyInvokeSentry(() => sentryState.sdk.captureCheckIn(finishedCheckIn));
  sentryState.checkInId = null;
  sentryState.checkInStartedAt = 0;
  return finishedCheckIn;
}

export async function runMonitoredPipeline(operation) {
  startSyncCheckIn();

  try {
    const result = await operation();
    finishSyncCheckIn("ok");
    await flushPipelineSentry();
    return result;
  } catch (error) {
    capturePipelineException(error, { outcome: "error" });
    finishSyncCheckIn("error");
    await flushPipelineSentry();
    throw error;
  }
}
