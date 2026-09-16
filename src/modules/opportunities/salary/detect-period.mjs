/**
 * @param {string} text
 * @param {number} anchor
 */
export function detectSalaryPeriod(text, anchor = 0) {
  const periodMarkers = [
    { period: "hour", pattern: /\b(?:hour|hourly|hr|hora|horas)\b|\/h\b/gi },
    { period: "month", pattern: /\b(?:month|monthly|mês|mes|meses)\b|\/m\b/gi },
  ];
  const matches = periodMarkers.flatMap(({ period, pattern }) =>
    [...text.matchAll(pattern)].map((match) => ({
      period,
      index: match.index ?? 0,
      distance: Math.abs((match.index ?? 0) - anchor),
    })),
  );

  if (matches.length === 0) {
    return "year";
  }

  matches.sort((left, right) => left.distance - right.distance || left.index - right.index);

  return matches[0].period;
}
