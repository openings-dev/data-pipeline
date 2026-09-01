export const sentryState = {
  checkInId: null,
  checkInStartedAt: 0,
  config: null,
  sdk: null,
};

export function cleanSentryLabel(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_.:/-]/gu, "-")
    .slice(0, 200);
  return normalized || fallback;
}

export function safelyInvokeSentry(callback, fallback = undefined) {
  try {
    return callback();
  } catch {
    return fallback;
  }
}

export function resetSentryState() {
  sentryState.checkInId = null;
  sentryState.checkInStartedAt = 0;
  sentryState.config = null;
  sentryState.sdk = null;
}
