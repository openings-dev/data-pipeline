import assert from "node:assert/strict";
import test from "node:test";

import { parseSalary } from "../src/modules/opportunities/salary-parser.mjs";

test("uses the salary marker instead of unrelated weekly hours", () => {
  assert.deepEqual(
    parseSalary("Remuneração: US$ 4.900 a US$ 6.500 por mês. Dedicação: 40 horas por semana."),
    { currency: "USD", min: 4900, max: 6500, period: "month" },
  );
});

test("keeps genuine hourly compensation hourly", () => {
  assert.deepEqual(
    parseSalary("Pay: USD 60–80 per hour. This is a full-time role, 40 hours per week."),
    { currency: "USD", min: 60, max: 80, period: "hour" },
  );
});

test("recognizes a period marker before the salary amount", () => {
  assert.deepEqual(
    parseSalary("Monthly salary: USD 5,000–6,000."),
    { currency: "USD", min: 5000, max: 6000, period: "month" },
  );
});

test("defaults a salary without a period marker to yearly", () => {
  assert.deepEqual(
    parseSalary("Salary: USD 90,000–120,000."),
    { currency: "USD", min: 90000, max: 120000, period: "year" },
  );
});
