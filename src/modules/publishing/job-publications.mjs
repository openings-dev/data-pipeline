import { createHash } from "node:crypto";

function requireText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Job ${label} is required.`);
  return value;
}

function hash(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export function buildWebEntityPublication({ sourceType, sourceId, title, summary = "", canonicalPath, content, revision = hash(content) }) {
  const contentSha256 = hash(content);
  return {
    schemaVersion: 1,
    identity: { tenant: "openings", sourceType, sourceId, revision, idempotencyKey: `openings:${sourceType}:${sourceId}:${revision}` },
    canonical: { title, summary, canonicalUrl: `https://openings.dev${canonicalPath}`, language: "pt-BR" },
    artifacts: [],
    deliveries: [{ id: "web", adapter: "web.r2", operation: "publish", required: true,
      payload: { type: "web.page", route: canonicalPath, entity: {
        schemaVersion: 1, tenant: "openings", kind: sourceType, id: sourceId, revision,
        canonicalPath, title, summary, status: "active", contentSha256, content,
      } } }],
  };
}

function publicationsForJob(job) {
  const id = requireText(job.id, "id");
  const revision = requireText(job.contentHash, "contentHash");
  const title = requireText(job.title, "title");
  const summary = typeof job.excerpt === "string" ? job.excerpt : "";
  const publications = [buildWebEntityPublication({ sourceType: "job", sourceId: id, title, summary,
    canonicalPath: `/jobs/${id}`, content: job, revision })];

  const handle = job.author?.handle;
  if (typeof handle === "string" && handle.length > 0) {
    const content = { ...job.author, latestJobId: id };
    publications.push(buildWebEntityPublication({ sourceType: "author", sourceId: handle,
      title: job.author.name || handle, summary: `Vagas publicadas por ${job.author.name || handle}`,
      canonicalPath: `/authors/${encodeURIComponent(handle)}`, content }));
  }

  const repository = job.community?.repository;
  if (typeof repository === "string" && /^[^/]+\/[^/]+$/u.test(repository)) {
    const content = { ...job.community, latestJobId: id };
    publications.push(buildWebEntityPublication({ sourceType: "community", sourceId: repository,
      title: job.community.name || repository, summary: `Vagas da comunidade ${job.community.name || repository}`,
      canonicalPath: `/communities/${repository.split("/").map(encodeURIComponent).join("/")}`, content }));
  }
  return publications;
}

export function buildNewJobPublications({ previousIds, jobs }) {
  const previous = new Set(previousIds);
  const publications = jobs.filter((job) => !previous.has(job.id))
    .sort((left, right) => String(left.id).localeCompare(String(right.id))).flatMap(publicationsForJob);
  return [...new Map(publications.map((publication) => [
    `${publication.identity.sourceType}:${publication.identity.sourceId}`,
    publication,
  ])).values()];
}
