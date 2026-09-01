import { canonicalOpportunity } from "./canonical-opportunity.mjs";
import { duplicateKeys } from "./deduplication-keys.mjs";

export { duplicateKeys } from "./deduplication-keys.mjs";

export function deduplicateOpportunities(items) {
  const parent = items.map((_, index) => index);
  const owners = new Map();
  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  };

  items.forEach((item, index) => {
    for (const key of duplicateKeys(item)) {
      const owner = owners.get(key);
      if (owner === undefined) owners.set(key, index);
      else union(owner, index);
    }
  });

  const groups = new Map();
  items.forEach((item, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(item);
    groups.set(root, group);
  });
  return [...groups.values()].map(canonicalOpportunity);
}

