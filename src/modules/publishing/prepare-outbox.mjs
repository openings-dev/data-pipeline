import { resolve } from "node:path";

import { readJsonIfExists } from "../storage/read-json-if-exists.mjs";
import { writeJsonIfChanged } from "../storage/write-json-if-changed.mjs";
import { buildNewJobPublications } from "./job-publications.mjs";
import { mergePublishingOutbox } from "./publishing-outbox.mjs";

export async function loadPublishingState(paths) {
  const outboxPath = resolve(paths.rootDir, "snapshots", "publishing", "outbox.json");
  const [jobIndex, outbox] = await Promise.all([
    readJsonIfExists(resolve(paths.snapshotRootDir, "api", "job-ids.json")),
    readJsonIfExists(outboxPath),
  ]);
  return {
    outboxPath,
    previousIds: jobIndex?.ids ?? [],
    publications: outbox?.publications ?? [],
  };
}

export async function updatePublishingOutbox(state, snapshot) {
  const jobs = snapshot.staticApiFiles
    .filter((file) => file.relativePath.startsWith("api/jobs/"))
    .flatMap((file) => Object.values(file.payload.items));
  const additions = buildNewJobPublications({ previousIds: state.previousIds, jobs });
  const publications = mergePublishingOutbox(state.publications, additions);
  await writeJsonIfChanged(state.outboxPath, { schemaVersion: 1, publications });
  return { added: additions.length, pending: publications.length };
}
