import { readFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync(new URL('./source-rights.json', import.meta.url), 'utf8'));
const sources = new Map(registry.sources.map(source => [source.repository.toLowerCase(), source]));

export function documentedSources(repositories) {
  return repositories.flatMap(repository => {
    const evidence = sources.get(repository.repository.toLowerCase());
    if (!evidence) return [];
    if (!evidence.notice || !evidence.readmeExplicitMit || !evidence.licensePredatesAllCurrentIssues) {
      throw new Error(`Incomplete source rights review: ${repository.repository}`);
    }
    const contentLicense = {
      repository: evidence.repository, spdx: evidence.spdx,
      licenseUrl: evidence.licenseAtLastChangeUrl, readmeUrl: evidence.readmeUrl,
      reviewedAt: registry.reviewedAt, basis: registry.basis, notice: evidence.notice,
    };
    return [{ ...repository, contentLicense }];
  });
}
