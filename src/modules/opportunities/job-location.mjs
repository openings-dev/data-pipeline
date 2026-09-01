import {
  canonicalCountry,
  countryAliases,
  countryFromSubdivision,
} from "./location-country.mjs";
import { displayLocation } from "./location-display.mjs";
import {
  labeledLocation,
  normalizedLocationText,
  titleCity,
  titleCountryHint,
  workModelFrom,
} from "./job-location-text.mjs";

function cityFromDetails(value, country) {
  const details = String(value ?? "").trim();
  if (!details) return {};
  const withoutModel = details
    .replace(/\b(remote|remoto|hybrid|h[ií]brido|on-site|presencial)\b/gi, "")
    .replace(/^[\s,·–—-]+|[\s,·–—-]+$/g, "")
    .trim();
  const stateMatch = withoutModel.match(/^([^,/]{2,60})\s*[,/]\s*([A-Za-z]{2})(?:\b|$)/);
  if (stateMatch && !/^(?:remote|remoto|hybrid|h[ií]brido|on-site|presencial)$/i
    .test(stateMatch[1].trim())) {
    return { city: stateMatch[1].trim(), subdivision: stateMatch[2].toUpperCase() };
  }
  const clean = withoutModel
    .replace(new RegExp(country?.country ?? "", "ig"), "")
    .replace(/\bpreferred\b\s*$/i, "")
    .replace(/^[\s,·–—-]+|[\s,·–—-]+$/g, "")
    .trim();
  if (canonicalCountry(clean)?.countryCode === country?.countryCode) return {};
  return clean && clean.length <= 60 ? { city: clean } : {};
}

function remoteScopeFrom(text, workModel, country) {
  if (workModel !== "remote") return "unspecified";
  const value = normalizedLocationText(text);
  if (/\b(global|worldwide|anywhere)\b/.test(value)) return "global";
  if (country) {
    const labels = [...countryAliases(country.countryCode), country.countryCode]
      .map(normalizedLocationText)
      .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const countryScope = new RegExp(
      `\\b(?:within|inside|in)\\s+(?:the\\s+)?(?:${labels})\\b|` +
      `\\bdentro\\s+d[eo]\\s+(?:${labels})\\b`,
    );
    if (countryScope.test(value)) return "country";
  }
  return "unspecified";
}

export function extractJobLocation({ title, body, sourceLocation, structured = {} }) {
  const combined = `${title ?? ""}\n${body ?? ""}`;
  const details = structured.locationDetails ?? labeledLocation(combined);
  const workModel = workModelFrom(structured.workModel) ??
    workModelFrom(title) ?? workModelFrom(details) ?? workModelFrom(combined);
  const explicitCountry = canonicalCountry(structured.country) ?? canonicalCountry(details) ??
    canonicalCountry(titleCountryHint(title));
  const titleLocation = titleCity(title);
  const sourceCountry = canonicalCountry(sourceLocation?.country);
  const specificSourceCountry = sourceCountry?.countryCode === "GLOBAL" ? null : sourceCountry;
  const subdivisionCountry = countryFromSubdivision(titleLocation?.subdivision);
  let country = explicitCountry ?? subdivisionCountry ??
    (titleLocation ? specificSourceCountry : null);
  const cityParts = titleLocation ?? cityFromDetails(details, country);
  if (!country && (cityParts.city || cityParts.subdivision)) {
    country = countryFromSubdivision(cityParts.subdivision) ?? specificSourceCountry;
  }

  if (!country && !cityParts.city && !workModel) {
    return { confidence: "unknown" };
  }

  const remoteScope = workModel === "remote" && titleCountryHint(title)
    ? "country"
    : remoteScopeFrom(`${structured.locationDetails ?? ""} ${combined}`, workModel, country);
  const resolved = {
    ...(country ?? {}),
    ...(structured.region ? { region: structured.region } : {}),
    ...cityParts,
    ...(workModel ? { workModel } : {}),
    ...(workModel ? { remoteScope } : {}),
  };

  return {
    ...resolved,
    displayText: displayLocation({ ...resolved, country, remoteScope }),
    confidence: "explicit",
  };
}
