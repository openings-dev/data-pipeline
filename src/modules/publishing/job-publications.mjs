function requireText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Job ${label} is required.`);
  return value;
}

function toPublication(job) {
  const id = requireText(job.id, "id");
  const revision = requireText(job.contentHash, "contentHash");
  const title = requireText(job.title, "title");
  const url = `https://openings.dev/jobs/${encodeURIComponent(id)}`;
  return {
    schemaVersion: 1,
    identity: {
      tenant: "openings",
      sourceType: "job",
      sourceId: id,
      revision,
      idempotencyKey: `openings:job:${id}:${revision}`,
    },
    canonical: {
      title,
      summary: typeof job.excerpt === "string" ? job.excerpt : "",
      canonicalUrl: url,
      language: "pt-BR",
    },
    artifacts: [],
    deliveries: [
      {
        id: "web",
        adapter: "web.pages",
        operation: "publish",
        required: true,
        payload: { type: "web.page", route: `/jobs/${id}` },
      },
      {
        id: "push",
        adapter: "push.onesignal",
        operation: "publish",
        required: true,
        dependsOn: [{ deliveryId: "web", state: "verified" }],
        payload: {
          type: "push.notification",
          audience: { type: "all-subscribers" },
          title: "Nova vaga no Openings",
          body: title,
          url,
        },
      },
    ],
  };
}

export function buildNewJobPublications({ previousIds, jobs }) {
  const previous = new Set(previousIds);
  return jobs
    .filter((job) => !previous.has(job.id))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    .map(toPublication);
}
