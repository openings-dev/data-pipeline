import { buildWebEntityPublication } from "./job-publications.mjs";

export const BACKFILL_BUDGET = Object.freeze({
  maximumPublications: 1_333,
  maximumR2Bytes: 4 * 1024 * 1024 * 1024,
  estimatedQueueOperationsPerPublication: 3,
  estimatedD1RowsPerPublication: 13,
});

export function buildPublishingBackfill({ jobs, authors, communities }) {
  const publications = [
    ...jobs.map(jobPublication),
    ...authors.map(authorPublication),
    ...communities.map(communityPublication),
  ].sort((left, right) => left.identity.idempotencyKey.localeCompare(right.identity.idempotencyKey));
  const unique = [...new Map(publications.map((item) => [
    `${item.identity.sourceType}:${item.identity.sourceId}`,
    item,
  ])).values()];
  const r2Bytes = unique.reduce((total, item) => total
    + Buffer.byteLength(JSON.stringify(item.deliveries[0].payload.entity.content)), 0);
  if (unique.length > BACKFILL_BUDGET.maximumPublications) throw new Error("Backfill exceeds the free queue-operation budget.");
  if (r2Bytes > BACKFILL_BUDGET.maximumR2Bytes) throw new Error("Backfill exceeds the internal R2 storage budget.");
  return {
    publications: unique,
    estimate: {
      publications: unique.length,
      queueOperations: unique.length * BACKFILL_BUDGET.estimatedQueueOperationsPerPublication,
      d1Rows: unique.length * BACKFILL_BUDGET.estimatedD1RowsPerPublication,
      r2Bytes,
    },
  };
}

function jobPublication(job) {
  return buildWebEntityPublication({ sourceType: "job", sourceId: job.id, title: job.title,
    summary: job.excerpt || "", canonicalPath: `/jobs/${job.id}`, content: job, revision: job.contentHash });
}

function authorPublication(profile) {
  const handle = profile.author.handle;
  return buildWebEntityPublication({ sourceType: "author", sourceId: handle,
    title: profile.author.name || handle, summary: `Vagas publicadas por ${profile.author.name || handle}`,
    canonicalPath: `/authors/${encodeURIComponent(handle)}`, content: profile });
}

function communityPublication(community) {
  const repository = community.repository;
  return buildWebEntityPublication({ sourceType: "community", sourceId: repository,
    title: community.name || repository, summary: `Vagas da comunidade ${community.name || repository}`,
    canonicalPath: `/communities/${repository.split("/").map(encodeURIComponent).join("/")}`, content: community });
}
