import {
  labeledLocation,
  titleCity,
  titleCountryHint,
  workModelFrom,
} from "./job-location-text.mjs";

const LEVEL = { unknown: 0, inferred: 1, declared: 2 };
const FIELDS = ["location", "salary", "seniority", "workModel"];

function isPresent(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function provenanceFor(present, declared) {
  if (!present) return "unknown";
  return declared ? "declared" : "inferred";
}

export function strongestProvenance(values) {
  return values.reduce(
    (best, value) => (LEVEL[value] ?? 0) > LEVEL[best] ? value : best,
    "unknown",
  );
}

export function buildDataProvenance({
  jobLocation,
  salary,
  taxonomy,
  declaredFields = new Set(),
}) {
  const declared = declaredFields instanceof Set
    ? declaredFields
    : new Set(declaredFields);
  const hasLocation = isPresent(jobLocation?.country) ||
    isPresent(jobLocation?.city) || isPresent(jobLocation?.subdivision);
  const hasWorkModel = isPresent(jobLocation?.workModel) ||
    isPresent(taxonomy?.workModels);

  return {
    location: provenanceFor(hasLocation, declared.has("location")),
    salary: provenanceFor(isPresent(salary), declared.has("salary")),
    seniority: provenanceFor(
      isPresent(taxonomy?.seniority),
      declared.has("seniority"),
    ),
    workModel: provenanceFor(hasWorkModel, declared.has("workModel")),
  };
}

export function addIssueDataProvenance(
  opportunity,
  { title, body, structured = {} },
) {
  const combinedText = `${title ?? ""}\n${body ?? ""}`;
  const labeled = labeledLocation(combinedText);
  const locationDetails = structured.locationDetails ?? labeled;
  const declaredFields = new Set([
    ...(structured.country || structured.locationDetails || titleCity(title) ||
      titleCountryHint(title) || labeled ? ["location"] : []),
    ...(structured.salary ? ["salary"] : []),
    ...(structured.seniority ? ["seniority"] : []),
    ...(structured.workModel || workModelFrom(title) || workModelFrom(locationDetails)
      ? ["workModel"] : []),
  ]);
  return {
    ...opportunity,
    dataProvenance: buildDataProvenance({
      jobLocation: opportunity.jobLocation,
      salary: opportunity.salary,
      taxonomy: opportunity.taxonomy,
      declaredFields,
    }),
  };
}

export function mergeDataProvenance(items) {
  return Object.fromEntries(FIELDS.map((field) => [
    field,
    strongestProvenance(
      items.map((item) => item.dataProvenance?.[field] ?? "unknown"),
    ),
  ]));
}
