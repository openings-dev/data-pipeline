import { RateLimitError } from "../../shared/errors/rate-limit-error.mjs";

/**
 * @param {string} token
 */
function buildHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "openings-data-pipeline-bot",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * @param {{ token: string; maxIssuesPerRepository: number; logger: ReturnType<import("../observability/logger.mjs").createLogger> }} options
 */
export function createGitHubClient(options) {
  const { token, maxIssuesPerRepository, logger } = options;

  return {
    /**
     * @param {string} repositoryFullName
     */
    async fetchRecentIssues(repositoryFullName) {
      const url = new URL(`https://api.github.com/repos/${repositoryFullName}/issues`);
      url.searchParams.set("state", "all");
      url.searchParams.set("sort", "updated");
      url.searchParams.set("direction", "desc");
      url.searchParams.set("per_page", String(maxIssuesPerRepository));
      url.searchParams.set("page", "1");

      const startedAt = Date.now();
      const response = await fetch(url, {
        headers: buildHeaders(token),
        cache: "no-store",
      });

      if (response.status === 404 || response.status === 451) {
        logger.warn("repository-not-readable", {
          repository: repositoryFullName,
          status: response.status,
        });
        return [];
      }

      if (
        response.status === 403 &&
        response.headers.get("x-ratelimit-remaining") === "0"
      ) {
        throw RateLimitError.fromResponse(response);
      }

      if (!response.ok) {
        throw new Error(
          `Unexpected response ${response.status} while fetching ${repositoryFullName}.`,
        );
      }

      /** @type {unknown} */
      const payload = await response.json();

      if (!Array.isArray(payload)) {
        return [];
      }

      const issues = payload.filter((issue) => !issue.pull_request);
      const openCount = issues.filter((issue) => issue.state === "open").length;
      const closedCount = issues.length - openCount;

      logger.info("github-fetch-ok", {
        repository: repositoryFullName,
        duration_ms: Date.now() - startedAt,
        fetched: issues.length,
        open: openCount,
        closed: closedCount,
      });

      return issues;
    },
  };
}
