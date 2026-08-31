import { readFile } from "node:fs/promises";

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
 * @param {unknown} value
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

    if (
      repository.requiredLabels !== undefined &&
      (!Array.isArray(repository.requiredLabels) ||
        repository.requiredLabels.length === 0 ||
        !repository.requiredLabels.every(isNonEmptyString))
    ) {
      throw new Error(
        "Invalid catalog repository: requiredLabels must be an array of non-empty strings.",
      );
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
