# Context-Aware Salary Period Detection

## Problem

The salary parser currently detects a salary period by scanning the entire job
title and description. Because hourly terms are checked first, unrelated workload
text such as `40 horas por semana` can override an explicit monthly salary such as
`US$ 4.900 a US$ 6.500 por mês`. This produced a normalized salary of USD
4,900–6,500 per hour and allowed the social publisher to render the incorrect
unit.

## Scope

Fix salary normalization in `data-pipeline` for future snapshot builds. Do not
delete, edit, reset, or republish any existing social post. Do not add a display
override to `social-publisher`; it must continue rendering the normalized data it
receives.

## Design

Salary period detection will use the text immediately surrounding the salary
match instead of the complete job description. The range and single-value parser
will pass a bounded context containing text shortly before and after the matched
amount to the period detector. This context includes period markers placed either
before or after the amount while excluding unrelated workload requirements later
in the description.

Within the bounded salary context, explicit hourly markers map to `hour`, monthly
markers map to `month`, and the existing annual default remains `year` when no
supported marker is present. Amount and currency parsing are unchanged.

## Safety and Compatibility

- Existing normalized salary schema remains unchanged.
- Explicit hourly salaries continue to parse as hourly even when the posting also
  describes a full-time schedule.
- Explicit monthly salaries remain monthly when the posting mentions weekly work
  hours elsewhere.
- Markers immediately before the amount, such as `monthly salary: $5,000`, remain
  supported.
- Salary text without a supported nearby period keeps the current annual default.
- Existing publications and publication state are outside this change.

## Verification

Add focused parser tests that reproduce the Strider wording and cover a genuine
hourly salary, a marker before the amount, and an unspecified-period salary. Run
the focused tests first in the red state, then after the minimal implementation,
followed by the complete repository validation suite.

