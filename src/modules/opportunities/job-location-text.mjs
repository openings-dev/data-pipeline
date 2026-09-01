export function normalizedLocationText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function workModelFrom(value) {
  const text = normalizedLocationText(value);
  if (/(^|\W)(remote|remoto|home office|wfh)(\W|$)/.test(text)) return "remote";
  if (/(^|\W)(hybrid|hibrido|hibrida)(\W|$)/.test(text)) return "hybrid";
  if (/(^|\W)(on-site|onsite|presencial|in person)(\W|$)/.test(text)) return "on-site";
  return undefined;
}

export function titleCity(value) {
  const match = String(value ?? "").match(
    /(?:^|[\[(-])(?:remot[oa]\s*[-–—]\s*)?([\p{Letter}][\p{Letter} .'-]{1,50})\s*\/\s*([A-Za-z]{2})(?:[\])]|\s|$)/u,
  );
  if (!match) return null;
  const city = match[1]
    .replace(/^(?:remot[oa]|remote)\s*[-–—]\s*/i, "")
    .split(/\s+[-–—]\s+/)
    .at(-1)
    .trim();
  if (/^(?:remote|remot[oa]|hybrid|h[ií]brid[oa]|on-site|presencial)$/i.test(city)) {
    return null;
  }
  return { city, subdivision: match[2].toUpperCase() };
}

export function titleCountryHint(value) {
  const match = String(value ?? "").match(
    /\b(?:remote|remot[oa])\s*[/|,-]\s*(united states|usa|us|united kingdom|uk)\b/i,
  );
  return match?.[1] ?? null;
}

export function labeledLocation(value) {
  const text = String(value ?? "");
  const inline = text.match(
    /(?:location|local(?:iza[cç][aã]o)?|ubicaci[oó]n|lieu|standort|sede|location details)\s*[:|-]\s*([^\n|]{2,80})/i,
  );
  if (inline?.[1]) return inline[1].trim();
  const section = text.match(
    /(?:^|\n)#{1,4}\s*(?:location|local(?:iza[cç][aã]o)?|ubicaci[oó]n|lieu|standort|sede|location details)\s*\n+([^\n]{2,80})/im,
  );
  return section?.[1]?.trim() || null;
}
