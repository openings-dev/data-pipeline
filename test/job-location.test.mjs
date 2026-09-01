import assert from "node:assert/strict";
import test from "node:test";

import { extractJobLocation } from "../src/modules/opportunities/job-location.mjs";

const brazilSource = {
  country: "Brazil",
  countryCode: "BR",
  region: "South America",
};

test("extracts an explicit Brazilian city, subdivision, and remote scope", () => {
  assert.deepEqual(extractJobLocation({
    title: "[Remoto - São Paulo/SP] Backend Engineer",
    body: "Modalidade: remoto dentro do Brasil",
    sourceLocation: brazilSource,
  }), {
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
    subdivision: "SP",
    city: "São Paulo",
    workModel: "remote",
    remoteScope: "country",
    displayText: "São Paulo, SP · Remote within Brazil",
    confidence: "explicit",
  });
});

test("does not present repository geography as confirmed job geography", () => {
  assert.deepEqual(extractJobLocation({
    title: "Software Engineer",
    body: "Build distributed systems.",
    sourceLocation: brazilSource,
  }), { confidence: "unknown" });
});
test("does not confuse short country aliases with fragments of country names", () => {
  assert.deepEqual(extractJobLocation({
    title: "Software Engineer",
    body: "Location: Australia",
    sourceLocation: brazilSource,
  }), {
    country: "Australia",
    countryCode: "AU",
    region: "Oceania",
    displayText: "Australia",
    confidence: "explicit",
  });

  assert.deepEqual(extractJobLocation({
    title: "Software Engineer",
    body: "Location: Russia",
    sourceLocation: brazilSource,
  }), {
    country: "Russia",
    countryCode: "RU",
    region: "Europe",
    displayText: "Russia",
    confidence: "explicit",
  });
});

test("recognizes short country aliases only as complete tokens", () => {
  assert.deepEqual(extractJobLocation({
    title: "Software Engineer",
    body: "Location: Remote, US",
    sourceLocation: brazilSource,
  }), {
    country: "United States",
    countryCode: "US",
    region: "North America",
    workModel: "remote",
    remoteScope: "unspecified",
    displayText: "United States · Remote",
    confidence: "explicit",
  });
});

test("infers US locations without inheriting a global community country", () => {
  const globalSource = { country: "Global", countryCode: "GLOBAL", region: "Global" };
  assert.deepEqual(extractJobLocation({
    title: "Software Engineer - San Jose/CA",
    body: "Build distributed systems.",
    sourceLocation: globalSource,
  }), {
    country: "United States",
    countryCode: "US",
    region: "North America",
    city: "San Jose",
    subdivision: "CA",
    displayText: "San Jose, CA",
    confidence: "explicit",
  });

  assert.deepEqual(extractJobLocation({
    title: "[Remote/US] Software Engineer",
    body: "Build distributed systems.",
    sourceLocation: globalSource,
  }), {
    country: "United States",
    countryCode: "US",
    region: "North America",
    workModel: "remote",
    remoteScope: "country",
    displayText: "United States · Remote within United States",
    confidence: "explicit",
  });
});

test("prioritizes an explicit title or location section over incidental remote text", () => {
  assert.deepEqual(extractJobLocation({
    title: "[Híbrido] Frontend Engineer",
    body: "## Local\nSão Paulo, SP\n\nWe also build tools for remote teams.",
    sourceLocation: brazilSource,
  }), {
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
    city: "São Paulo",
    subdivision: "SP",
    workModel: "hybrid",
    remoteScope: "unspecified",
    displayText: "São Paulo, SP · Hybrid",
    confidence: "explicit",
  });
});
test("recognizes an explicitly labeled Nigerian remote preference", () => {
  assert.deepEqual(extractJobLocation({
    title: "Fractional CTO",
    body: "Location: Remote — Nigeria preferred",
    sourceLocation: {
      country: "Global",
      countryCode: "GLOBAL",
      region: "Global",
    },
  }), {
    country: "Nigeria",
    countryCode: "NG",
    region: "Africa",
    workModel: "remote",
    remoteScope: "unspecified",
    displayText: "Nigeria · Remote",
    confidence: "explicit",
  });
});

test("does not turn incidental Nigerian market prose into a job location", () => {
  assert.deepEqual(extractJobLocation({
    title: "Platform Engineer",
    body: "Build software used by customers in Nigeria.",
    sourceLocation: {
      country: "Global",
      countryCode: "GLOBAL",
      region: "Global",
    },
  }), { confidence: "unknown" });
});
