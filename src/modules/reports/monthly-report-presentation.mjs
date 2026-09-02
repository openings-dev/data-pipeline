const integer = new Intl.NumberFormat("en-US");

function periodLabel(period) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00.000Z`));
}

function tableRows(entries, labelKey) {
  return entries
    .map((entry) => `| ${String(entry[labelKey]).replaceAll("|", "\\|")} | ${integer.format(entry.openOpportunities)} |`)
    .join("\n");
}

export function renderMonthlyReportMarkdown(report) {
  const countries = tableRows(report.topCountries, "country");
  const technologies = tableRows(report.topTechnologies, "technology");
  const workModels = report.workModels
    .map(({ model, openOpportunities }) => `${model}: ${integer.format(openOpportunities)}`)
    .join(", ");

  return `# Openings public index — ${periodLabel(report.period)}

This is a point-in-time view of the public technology jobs indexed by openings.dev. Every listing remains connected to its original public source.

Snapshot generated at \`${report.snapshot.generatedAt}\`.

## Highlights

- **${integer.format(report.totals.openOpportunities)} open jobs**
- **${integer.format(report.totals.communities)} public communities** in the catalog
- **${integer.format(report.totals.repositories)} repositories** with open listings
- **${integer.format(report.totals.countries)} countries** across **${integer.format(report.totals.regions)} regions**

## Top countries by open jobs

| Country | Open jobs |
| --- | ---: |
${countries}

## Technologies seen most often

| Technology | Open jobs |
| --- | ---: |
${technologies}

## Work and salary signals

- Work models: ${workModels}
- **${report.salaryDisclosure.percentage}% disclose salary** (${integer.format(report.salaryDisclosure.disclosed)} of ${integer.format(report.salaryDisclosure.disclosed + report.salaryDisclosure.undisclosed)} jobs)

## Method

Counts come directly from the versioned public opportunity manifest for this snapshot using methodology version ${report.methodologyVersion}. Read the [methodology](https://openings.dev/methodology) or inspect the [public data pipeline](https://github.com/openings-dev/data-pipeline).
`;
}

export function buildMonthlyReportIndex(reports) {
  const ordered = [...reports].sort((left, right) => right.period.localeCompare(left.period));
  const latest = ordered[0] ?? null;

  return {
    schemaVersion: 1,
    generatedAt: latest?.snapshot.generatedAt ?? null,
    latestPeriod: latest?.period ?? null,
    reports: ordered.map((report) => ({
      period: report.period,
      generatedAt: report.snapshot.generatedAt,
      totals: report.totals,
      json: `${report.period}.json`,
      markdown: `${report.period}.md`,
    })),
  };
}
