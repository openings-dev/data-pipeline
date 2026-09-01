const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
function timestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? null : parsed;
}
function finiteCount(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}
function publicRun(run) {
  const completedAt = timestamp(run?.completedAt);
  if (completedAt === null) return null;
  const startedAt = timestamp(run?.startedAt);
  return {
    startedAt: startedAt === null
      ? new Date(completedAt).toISOString()
      : new Date(startedAt).toISOString(),
    completedAt: new Date(completedAt).toISOString(),
    durationMs: finiteCount(run?.durationMs),
    outcome: run?.outcome === "partial" ? "partial" : "healthy",
    communities: finiteCount(run?.communities),
    successful: finiteCount(run?.successful),
    failed: finiteCount(run?.failed),
    noOpenings: finiteCount(run?.noOpenings),
    openOpportunities: finiteCount(run?.openOpportunities),
  };
}
function aggregateDays(runs) {
  const days = new Map();
  for (const run of runs) {
    const date = run.completedAt.slice(0, 10);
    const day = days.get(date) ?? {
      date,
      runs: 0,
      partialRuns: 0,
      failedCommunityRuns: 0,
      latestOpenOpportunities: run.openOpportunities,
    };
    day.runs += 1;
    if (run.outcome === "partial") day.partialRuns += 1;
    day.failedCommunityRuns += run.failed;
    days.set(date, day);
  }
  return [...days.values()];
}
export function buildStatusHistory({
  startedAt,
  completedAt,
  repositories,
  synchronizedRepositories,
  failedRepositories,
  status,
  openOpportunities,
  previousHistory,
}) {
  const completedTimestamp = timestamp(completedAt);
  if (completedTimestamp === null) {
    throw new Error("Status history requires a valid completedAt timestamp.");
  }
  const startedTimestamp = timestamp(startedAt);
  const synchronized = new Set(synchronizedRepositories ?? []);
  const failures = new Set(
    (failedRepositories ?? []).map((failure) => failure.repository).filter(Boolean),
  );
  const repositoryNames = new Set(
    (repositories ?? []).map((repository) => repository.repository).filter(Boolean),
  );
  const current = publicRun({
    startedAt,
    completedAt,
    durationMs: startedTimestamp === null
      ? 0
      : Math.max(0, completedTimestamp - startedTimestamp),
    outcome: failures.size > 0 ? "partial" : "healthy",
    communities: repositoryNames.size,
    successful: synchronized.size,
    failed: failures.size,
    noOpenings: status?.totals?.noOpenings,
    openOpportunities,
  });
  const byCompletion = new Map(
    (previousHistory?.runs ?? [])
      .map(publicRun)
      .filter(Boolean)
      .map((run) => [run.completedAt, run]),
  );
  byCompletion.set(current.completedAt, current);
  const cutoff = completedTimestamp - RETENTION_DAYS * DAY_MS;
  const runs = [...byCompletion.values()]
    .filter((run) => timestamp(run.completedAt) >= cutoff)
    .sort((left, right) => timestamp(right.completedAt) - timestamp(left.completedAt));
  return {
    generatedAt: current.completedAt,
    retentionDays: RETENTION_DAYS,
    runs,
    days: aggregateDays(runs),
  };
}
