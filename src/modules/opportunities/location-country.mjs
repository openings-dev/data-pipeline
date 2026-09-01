const COUNTRY_ALIASES = [
  { names: ["angola"], country: "Angola", countryCode: "AO", region: "Africa" },
  { names: ["argentina"], country: "Argentina", countryCode: "AR", region: "South America" },
  { names: ["australia"], country: "Australia", countryCode: "AU", region: "Oceania" },
  { names: ["austria"], country: "Austria", countryCode: "AT", region: "Europe" },
  { names: ["brazil", "brasil"], country: "Brazil", countryCode: "BR", region: "South America" },
  { names: ["canada"], country: "Canada", countryCode: "CA", region: "North America" },
  { names: ["chile"], country: "Chile", countryCode: "CL", region: "South America" },
  { names: ["china"], country: "China", countryCode: "CN", region: "Asia" },
  { names: ["colombia"], country: "Colombia", countryCode: "CO", region: "South America" },
  { names: ["el salvador"], country: "El Salvador", countryCode: "SV", region: "North America" },
  { names: ["france", "franca"], country: "France", countryCode: "FR", region: "Europe" },
  { names: ["germany", "alemanha"], country: "Germany", countryCode: "DE", region: "Europe" },
  { names: ["global", "worldwide"], country: "Global", countryCode: "GLOBAL", region: "Global" },
  { names: ["hong kong"], country: "Hong Kong", countryCode: "HK", region: "Asia" },
  { names: ["india"], country: "India", countryCode: "IN", region: "Asia" },
  { names: ["ireland"], country: "Ireland", countryCode: "IE", region: "Europe" },
  { names: ["italy", "italia"], country: "Italy", countryCode: "IT", region: "Europe" },
  { names: ["japan"], country: "Japan", countryCode: "JP", region: "Asia" },
  { names: ["mexico"], country: "Mexico", countryCode: "MX", region: "North America" },
  { names: ["netherlands", "holland"], country: "Netherlands", countryCode: "NL", region: "Europe" },
  { names: ["nigeria"], country: "Nigeria", countryCode: "NG", region: "Africa" },
  { names: ["poland"], country: "Poland", countryCode: "PL", region: "Europe" },
  { names: ["portugal"], country: "Portugal", countryCode: "PT", region: "Europe" },
  { names: ["russia"], country: "Russia", countryCode: "RU", region: "Europe" },
  { names: ["singapore"], country: "Singapore", countryCode: "SG", region: "Asia" },
  { names: ["spain", "espanha", "espana"], country: "Spain", countryCode: "ES", region: "Europe" },
  { names: ["switzerland"], country: "Switzerland", countryCode: "CH", region: "Europe" },
  { names: ["taiwan"], country: "Taiwan", countryCode: "TW", region: "Asia" },
  { names: ["ukraine"], country: "Ukraine", countryCode: "UA", region: "Europe" },
  { names: ["united kingdom", "uk"], country: "United Kingdom", countryCode: "GB", region: "Europe" },
  { names: ["united states", "usa", "us"], country: "United States", countryCode: "US", region: "North America" },
  { names: ["vietnam"], country: "Vietnam", countryCode: "VN", region: "Asia" },
];

const US_STATE_CODES = new Set(
  "AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC"
    .split(" "),
);

function normalized(value) {
  return String(value ?? "").toLowerCase().normalize("NFD")
    .replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
}

export function canonicalCountry(value) {
  const candidate = normalized(value);
  if (!candidate) return null;
  const match = COUNTRY_ALIASES.find(({ names }) =>
    names.some((name) => {
      if (candidate === name) return true;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|[^\\p{Letter}\\p{Number}])${escaped}(?:$|[^\\p{Letter}\\p{Number}])`, "u")
        .test(candidate);
    }));
  return match
    ? { country: match.country, countryCode: match.countryCode, region: match.region }
    : null;
}

export function countryFromSubdivision(value) {
  return US_STATE_CODES.has(String(value ?? "").trim().toUpperCase())
    ? canonicalCountry("United States")
    : null;
}

export function countryAliases(countryCode) {
  return COUNTRY_ALIASES.find((country) => country.countryCode === countryCode)?.names ?? [];
}
