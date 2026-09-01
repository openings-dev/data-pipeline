export function displayLocation({ city, subdivision, country, workModel, remoteScope }) {
  const geographic = city
    ? [city, subdivision || country?.country].filter(Boolean).join(", ")
    : country?.country;
  const model = workModel === "remote"
    ? remoteScope === "global"
      ? "Remote worldwide"
      : remoteScope === "country" && country
        ? `Remote within ${country.country}`
        : "Remote"
    : workModel === "hybrid"
      ? "Hybrid"
      : workModel === "on-site" ? "On-site" : null;
  return [geographic, model].filter(Boolean).join(" · ") || undefined;
}

