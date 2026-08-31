/**
 * @param {Array<{id?: string; createdAt: string; promotion?: {type?: string}}>} opportunities
 */
export function sortOpportunitiesByDate(opportunities) {
  return [...opportunities].sort((left, right) => {
    const promotionComparison = Number(right.promotion?.type === "sponsored") -
      Number(left.promotion?.type === "sponsored");
    if (promotionComparison !== 0) return promotionComparison;

    const dateComparison = new Date(right.createdAt).getTime() -
      new Date(left.createdAt).getTime();
    if (dateComparison !== 0) return dateComparison;

    return String(left.id ?? "").localeCompare(String(right.id ?? ""));
  });
}
