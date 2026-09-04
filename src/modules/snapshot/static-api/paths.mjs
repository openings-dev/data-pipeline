import { resolve } from "node:path";

const API_ROOT = "api";

function pageName(pageIndex) {
  return `page-${String(pageIndex).padStart(4, "0")}.json`;
}

export function staticApiManifestPath() {
  return `${API_ROOT}/manifest.json`;
}

export function staticApiCommunitiesPath() {
  return `${API_ROOT}/communities.json`;
}

export function staticApiFacetIndexPath() {
  return `${API_ROOT}/facet-index.json`;
}

export function staticApiSearchIndexPath() {
  return `${API_ROOT}/search-index.json`;
}

export function staticApiPageLookupPath() {
  return `${API_ROOT}/page-lookup.json`;
}

export function staticApiJobIdsPath() {
  return `${API_ROOT}/job-ids.json`;
}

export function staticApiOrderPath() {
  return `${API_ROOT}/order/recent.json`;
}

export function staticApiAliasesPath() {
  return `${API_ROOT}/aliases.json`;
}

export function staticApiStatusPath() {
  return `${API_ROOT}/status.json`;
}

export function staticApiStatusHistoryPath() {
  return `${API_ROOT}/status-history.json`;
}

export function staticApiPagePath(pageIndex) {
  return `${API_ROOT}/pages/${pageName(pageIndex)}`;
}

export function staticApiJobBucketPath(id) {
  const bucket = String(id ?? "").replace(/^gh_/, "").slice(0, 2) || "unknown";
  return `${API_ROOT}/jobs/${bucket}.json`;
}

export function staticApiAuthorPath(handle) {
  return `${API_ROOT}/authors/${encodeURIComponent(String(handle ?? "").trim().replace(/^@+/, ""))}.json`;
}

export function toFile(snapshotRootDir, relativePath, payload) {
  return {
    relativePath,
    filePath: resolve(snapshotRootDir, relativePath),
    payload,
  };
}
