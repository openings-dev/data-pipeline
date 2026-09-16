import { normalizeText } from "../../shared/utils/text.mjs";
import { detectSalaryPeriod } from "./salary/detect-period.mjs";
import { parseAmount } from "./salary/parse-amount.mjs";
import { parseCurrency } from "./salary/parse-currency.mjs";

const RANGE_PATTERN =
  /(R\$|US\$|USD|BRL|EUR|CAD|€|\$|£)\s*([0-9][0-9.,\s]*[kKmM]?)\s*(?:-|–|—|to|a|até)\s*(?:R\$|US\$|USD|BRL|EUR|CAD|€|\$|£)?\s*([0-9][0-9.,\s]*[kKmM]?)/i;
const SINGLE_PATTERN =
  /(?:salary|sal[aá]rio|compensation|pay|faixa)[^\dRUSBECAD€$£]{0,24}(R\$|US\$|USD|BRL|EUR|CAD|€|\$|£)\s*([0-9][0-9.,\s]*[kKmM]?)/i;
const SALARY_CONTEXT_BEFORE = 48;
const SALARY_CONTEXT_AFTER = 96;

function getSalaryContext(content, match) {
  const matchStart = match.index ?? 0;
  const matchEnd = matchStart + match[0].length;
  const contextStart = Math.max(0, matchStart - SALARY_CONTEXT_BEFORE);
  const contextEnd = Math.min(content.length, matchEnd + SALARY_CONTEXT_AFTER);

  return {
    text: content.slice(contextStart, contextEnd),
    anchor: matchEnd - contextStart,
  };
}

function parseRangeSalary(content, repository) {
  const rangeMatch = content.match(RANGE_PATTERN);

  if (!rangeMatch) {
    return undefined;
  }

  const currency = parseCurrency(rangeMatch[1], repository);
  const min = parseAmount(rangeMatch[2]);
  const max = parseAmount(rangeMatch[3]);

  if (!currency || !min || !max) {
    return undefined;
  }

  const salaryContext = getSalaryContext(content, rangeMatch);

  return {
    currency,
    min: Math.min(min, max),
    max: Math.max(min, max),
    period: detectSalaryPeriod(salaryContext.text, salaryContext.anchor),
  };
}

function parseSingleSalary(content, repository) {
  const singleMatch = content.match(SINGLE_PATTERN);

  if (!singleMatch) {
    return undefined;
  }

  const currency = parseCurrency(singleMatch[1], repository);
  const amount = parseAmount(singleMatch[2]);

  if (!currency || !amount) {
    return undefined;
  }

  const salaryContext = getSalaryContext(content, singleMatch);

  return {
    currency,
    min: amount,
    period: detectSalaryPeriod(salaryContext.text, salaryContext.anchor),
  };
}

/**
 * @param {string} text
 * @param {{countryCode?: string}} repository
 */
export function parseSalary(text, repository) {
  const content = normalizeText(text);
  return parseRangeSalary(content, repository) || parseSingleSalary(content, repository);
}
