/**
 * @param {Array<{id: string; promotion?: {type?: string}}>} items
 */
export function buildPromotionsIndex(items) {
  return {
    ids: items
      .filter((item) => item.promotion?.type === "sponsored")
      .map((item) => item.id),
  };
}
