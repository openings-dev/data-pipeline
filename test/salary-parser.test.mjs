import assert from "node:assert/strict";
import test from "node:test";

import { parseSalary } from "../src/modules/opportunities/salary-parser.mjs";

test("uses the salary marker instead of unrelated weekly hours", () => {
  assert.deepEqual(
    parseSalary(`💼 Cargo: Integrations Back-end Engineer
🌎 Modelo: 100% remoto – LATAM
💰 Remuneração: US$ 4.900 a US$ 6.500 por mês
📆 Equivalente anual: US$ 58.800 a US$ 78.000 por ano
🇺🇸 Inglês: C2+
💻 Experiência: 6+ anos
⏳ Contrato: Long-term
🕐 Dedicação: 40h/semana

🔎 O que buscamos:

Profissional Backend com experiência sólida em desenvolvimento de integrações, APIs e sistemas modernos, que consiga trabalhar com autonomia em projetos internacionais.

🛠️ Principais tecnologias/conhecimentos:

✔️ Node.js
✔️ REST APIs
✔️ Integrações de sistemas
✔️ AI Technologies
✔️ Desenvolvimento Backend
✔️ Arquitetura e desenvolvimento de APIs
✔️ Integração entre diferentes serviços e plataformas

🤖 Sobre a posição

A oportunidade é para atuar como Integrations Back-end Engineer, trabalhando principalmente com desenvolvimento backend, integrações e APIs REST, além de tecnologias relacionadas à Inteligência Artificial.

É uma posição de longo prazo, com dedicação de 40 horas por semana, voltada para profissionais experientes e com inglês C2+.`),
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
