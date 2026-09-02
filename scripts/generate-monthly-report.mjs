import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertMonthlyReportIsImmutable,
  buildMonthlyReport,
} from "../src/modules/reports/monthly-report.mjs";
import {
  buildMonthlyReportIndex,
  renderMonthlyReportMarkdown,
} from "../src/modules/reports/monthly-report-presentation.mjs";

const root = process.cwd();
const reportsDirectory = path.join(root, "reports", "monthly");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function main() {
  const manifest = await readJson(
    path.join(root, "snapshots", "opportunities", "api", "manifest.json"),
  );
  const report = buildMonthlyReport(manifest);
  const jsonPath = path.join(reportsDirectory, `${report.period}.json`);
  const markdownPath = path.join(reportsDirectory, `${report.period}.md`);

  await mkdir(reportsDirectory, { recursive: true });
  try {
    assertMonthlyReportIsImmutable(await readJson(jsonPath), report);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(markdownPath, renderMonthlyReportMarkdown(report));
  }

  const files = await readdir(reportsDirectory);
  const reports = await Promise.all(
    files
      .filter((file) => /^\d{4}-\d{2}\.json$/u.test(file))
      .map((file) => readJson(path.join(reportsDirectory, file))),
  );
  const index = buildMonthlyReportIndex(reports);
  await writeFile(
    path.join(reportsDirectory, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );

  console.log(`monthly-report-ok period=${report.period}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
