# Context-Aware Salary Period Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent unrelated workload text such as `40 horas por semana` from turning an explicitly monthly salary into an hourly salary.

**Architecture:** Keep amount and currency parsing unchanged. The salary parser will extract a bounded window around the matched amount and pass the salary position to the period detector; the detector will choose the closest supported period marker in that window, falling back to `year` when none exists.

**Tech Stack:** Node.js ESM, built-in `node:test`, existing opportunity salary parser.

---

## File map

- Create `test/salary-parser.test.mjs`: focused regression and compatibility tests for salary-period inference.
- Modify `src/modules/opportunities/salary-parser.mjs`: derive bounded context and anchor from the exact range or single salary match.
- Modify `src/modules/opportunities/salary/detect-period.mjs`: select the nearest hourly or monthly marker to the salary anchor.

### Task 1: Reproduce the incorrect monthly-to-hourly inference

**Files:**
- Create: `test/salary-parser.test.mjs`

- [ ] **Step 1: Add focused behavior tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import { parseSalary } from "../src/modules/opportunities/salary-parser.mjs";

const brazil = { countryCode: "BR" };

test("keeps an explicit monthly salary when workload text mentions hours", () => {
  assert.deepEqual(parseSalary(
    "Remuneração: US$ 4.900 a US$ 6.500 por mês. Dedicação: 40 horas por semana.",
    brazil,
  ), { currency: "USD", min: 4900, max: 6500, period: "month" });
});

test("keeps a genuine hourly salary when the role also describes a full-time schedule", () => {
  assert.deepEqual(parseSalary(
    "Pay: USD 60–80 per hour. This is a full-time role, 40 hours per week.",
    brazil,
  ), { currency: "USD", min: 60, max: 80, period: "hour" });
});

test("recognizes a period marker immediately before the amount", () => {
  assert.deepEqual(parseSalary("Monthly salary: USD 5,000–6,000.", brazil), {
    currency: "USD", min: 5000, max: 6000, period: "month",
  });
});

test("keeps the annual default when no nearby period is declared", () => {
  assert.deepEqual(parseSalary("Salary: USD 90,000–120,000.", brazil), {
    currency: "USD", min: 90000, max: 120000, period: "year",
  });
});
```

- [ ] **Step 2: Run the focused test and verify the regression is red**

Run: `node --test test/salary-parser.test.mjs`

Expected: the Strider regression fails with `period: "hour"` while the compatibility cases document the intended behavior.

- [ ] **Step 3: Commit the red test**

```bash
git add test/salary-parser.test.mjs
git commit -m "test: reproduce salary period context bug"
```

### Task 2: Detect the nearest period marker around the salary

**Files:**
- Modify: `src/modules/opportunities/salary-parser.mjs`
- Modify: `src/modules/opportunities/salary/detect-period.mjs`
- Test: `test/salary-parser.test.mjs`

- [ ] **Step 1: Add bounded salary context in the parser**

Add constants and a helper to `salary-parser.mjs`:

```js
const SALARY_CONTEXT_BEFORE = 48;
const SALARY_CONTEXT_AFTER = 96;

function salaryPeriodContext(content, match) {
  const matchIndex = match.index;
  const start = Math.max(0, matchIndex - SALARY_CONTEXT_BEFORE);
  const amountEnd = matchIndex + match[0].length;
  const end = Math.min(content.length, amountEnd + SALARY_CONTEXT_AFTER);
  return {
    text: content.slice(start, end),
    anchor: amountEnd - start,
  };
}
```

In both `parseRangeSalary` and `parseSingleSalary`, replace the whole-document period call with:

```js
const periodContext = salaryPeriodContext(content, rangeMatch);
// Use singleMatch in parseSingleSalary.
period: detectSalaryPeriod(periodContext.text, periodContext.anchor),
```

- [ ] **Step 2: Select the closest supported marker in `detect-period.mjs`**

Replace the whole-text priority checks with marker collection and distance ordering:

```js
const PERIOD_PATTERNS = Object.freeze([
  { period: "hour", pattern: /hour|hr|hora|\/h/giu },
  { period: "month", pattern: /month|monthly|mês|mes|\/m/giu },
]);

export function detectSalaryPeriod(text, anchor = 0) {
  const candidates = PERIOD_PATTERNS.flatMap(({ period, pattern }) => (
    [...text.matchAll(pattern)].map((match) => ({
      period,
      distance: Math.abs(match.index - anchor),
      index: match.index,
    }))
  ));
  candidates.sort((left, right) => left.distance - right.distance || left.index - right.index);
  return candidates[0]?.period ?? "year";
}
```

Keep the public return values exactly `hour`, `month`, or `year`.

- [ ] **Step 3: Run the focused test and verify green**

Run: `node --test test/salary-parser.test.mjs`

Expected: 4 tests pass, including the exact monthly salary plus weekly-hours regression.

- [ ] **Step 4: Run all repository tests**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/modules/opportunities/salary-parser.mjs \
  src/modules/opportunities/salary/detect-period.mjs
git commit -m "fix: detect salary period near compensation"
```

### Task 3: Validate the complete repository and scope

**Files:**
- Verify only; no production files should be added in this task.

- [ ] **Step 1: Run full validation**

Run: `npm run validate`

Expected: the complete test suite and repository validation pass.

- [ ] **Step 2: Verify formatting and scope**

Run: `git diff --check origin/main...HEAD`

Expected: no whitespace errors.

Run: `git diff --name-only origin/main...HEAD`

Expected files:

```text
docs/superpowers/plans/2026-09-16-salary-period-context.md
docs/superpowers/specs/2026-09-16-salary-period-context-design.md
src/modules/opportunities/salary-parser.mjs
src/modules/opportunities/salary/detect-period.mjs
test/salary-parser.test.mjs
```

- [ ] **Step 3: Confirm no publication-state or snapshot mutation**

Run: `git diff --name-only origin/main...HEAD | rg '^(snapshots/|state/|\.github/)'`

Expected: no output.
