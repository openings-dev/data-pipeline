import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMonthlyReportIsImmutable,
  buildMonthlyReport,
} from "../src/modules/reports/monthly-report.mjs";
import {
  buildMonthlyReportIndex,
  renderMonthlyReportMarkdown,
} from "../src/modules/reports/monthly-report-presentation.mjs";

const manifest = {
  generatedAt: "2026-09-02T18:18:07.026Z",
  dataHash: "manifest-hash",
  totals: {
    openOpportunities: 12,
    communities: 7,
    countries: 3,
    regions: 2,
    repositories: 5,
  },
  facets: {
    countries: { Brazil: 8, Portugal: 3, Global: 1 },
    technologies: { react: 7, nodejs: 7, python: 3 },
    workModels: { remote: 9, hybrid: 2, "on-site": 1 },
    salaryDisclosed: { true: 5, false: 7 },
  },
};

test("builds a deterministic report from the public manifest", () => {
  const report = buildMonthlyReport(manifest);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.methodologyVersion, 1);
  assert.equal(report.period, "2026-09");
  assert.equal(report.snapshot.generatedAt, manifest.generatedAt);
  assert.equal(report.snapshot.dataHash, manifest.dataHash);
  assert.deepEqual(report.totals, manifest.totals);
  assert.deepEqual(report.topCountries, [
    { country: "Brazil", openOpportunities: 8 },
    { country: "Portugal", openOpportunities: 3 },
    { country: "Global", openOpportunities: 1 },
  ]);
  assert.deepEqual(report.topTechnologies, [
    { technology: "nodejs", openOpportunities: 7 },
    { technology: "react", openOpportunities: 7 },
    { technology: "python", openOpportunities: 3 },
  ]);
  assert.deepEqual(report.workModels, [
    { model: "remote", openOpportunities: 9 },
    { model: "hybrid", openOpportunities: 2 },
    { model: "on-site", openOpportunities: 1 },
  ]);
  assert.deepEqual(report.salaryDisclosure, {
    disclosed: 5,
    undisclosed: 7,
    percentage: 41.7,
  });
});

test("renders a readable public report and index", () => {
  const report = buildMonthlyReport(manifest);
  const markdown = renderMonthlyReportMarkdown(report);
  const index = buildMonthlyReportIndex([report]);

  assert.match(markdown, /# Openings public index — September 2026/u);
  assert.match(markdown, /12 open jobs/u);
  assert.match(markdown, /\| Brazil \| 8 \|/u);
  assert.match(markdown, /\| nodejs \| 7 \|/u);
  assert.match(markdown, /41\.7% disclose salary/u);
  assert.equal(index.latestPeriod, "2026-09");
  assert.equal(index.reports[0].json, "2026-09.json");
  assert.equal(index.reports[0].markdown, "2026-09.md");
});

test("refuses to replace an existing monthly snapshot", () => {
  const report = buildMonthlyReport(manifest);

  assert.doesNotThrow(() => assertMonthlyReportIsImmutable(report, report));
  assert.throws(
    () => assertMonthlyReportIsImmutable(report, {
      ...report,
      totals: { ...report.totals, openOpportunities: 13 },
    }),
    /immutable/u,
  );
});
