import { readFile } from "node:fs/promises";
import { ISSUE_POLICIES } from "../opportunities/issue-admission.mjs";

/**
 * @param {string} value
 * @param {string} fieldName
 */
function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid catalog repository: ${fieldName} field is required.`);
  }
}

/**
 * @param {unknown} catalog
 */
function assertCatalogShape(catalog) {
  if (!catalog || typeof catalog !== "object") {
    throw new Error("Invalid catalog: expected object.");
  }

  if (!Array.isArray(catalog.repositories)) {
    throw new Error("Invalid catalog: repositories must be an array.");
  }

  for (const repository of catalog.repositories) {
    if (!repository || typeof repository !== "object") {
      throw new Error("Invalid catalog repository: expected object.");
    }

    assertNonEmptyString(repository.repository, "repository");
    assertNonEmptyString(repository.country, "country");
    assertNonEmptyString(repository.countryCode, "countryCode");
    assertNonEmptyString(repository.region, "region");
    assertNonEmptyString(repository.url, "url");
    if (repository.issuePolicy !== undefined && !ISSUE_POLICIES.has(repository.issuePolicy)) {
      throw new Error(`Invalid issue policy for ${repository.repository}: ${repository.issuePolicy}`);
    }
    if (repository.excludedIssues !== undefined) {
      if (!Array.isArray(repository.excludedIssues)) throw new Error("excludedIssues must be an array.");
      const seen = new Set();
      for (const entry of repository.excludedIssues) {
        if (!Number.isInteger(entry?.number) || entry.number < 1 || seen.has(entry.number)) {
          throw new Error(`Invalid excluded issue number for ${repository.repository}.`);
        }
        assertNonEmptyString(entry.reason, "excluded issue reason");
        if (entry.evidenceUrl !== `${repository.url}/issues/${entry.number}`) {
          throw new Error(`Excluded issue evidence must match ${repository.repository}#${entry.number}.`);
        }
        seen.add(entry.number);
      }
    }
  }
}

/**
 * @param {string} filePath
 */
export async function readRepositoryCatalog(filePath) {
  const content = await readFile(filePath, "utf8");
  const catalog = JSON.parse(content);
  assertCatalogShape(catalog);
  return catalog;
}
