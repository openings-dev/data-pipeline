import { buildNewJobPublications } from "./job-publications.mjs";
import { dispatchPublishingOutbox } from "./publishing-outbox.mjs";

export async function runPublishingShadowSmoke({ job, send }) {
  const publications = buildNewJobPublications({ previousIds: [], jobs: [job] });
  const result = await dispatchPublishingOutbox(publications, send);
  if (result.remaining.length > 0) {
    throw new Error(`Shadow intake retained ${result.remaining.length} publication.`);
  }
  return { accepted: result.accepted, pending: result.remaining.length };
}
