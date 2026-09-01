export const OPERATIONAL_LABELS = new Set([
  "ad-request", "approved", "awaiting-triage", "aguardando-triagem", "bug", "edit",
  "enhancement", "good-first-issue", "help-wanted", "needs-info", "stale",
]);

export const AREA_PATTERNS = {
  backend: ["backend", "back-end", "back end"],
  "data-ai": ["data engineer", "data science", "machine learning", "artificial intelligence", " ai ", " ml ", "llm"],
  design: ["product designer", "ux designer", "ui designer", "ux/ui", "design"],
  "devops-sre": ["devops", "site reliability", "sre", "platform engineer", "infrastructure engineer"],
  frontend: ["frontend", "front-end", "front end"],
  fullstack: ["fullstack", "full-stack", "full stack"],
  leadership: ["engineering manager", "tech lead", "technical lead", "cto"],
  mobile: ["mobile", "android", "ios", "flutter", "react native"],
  product: ["product manager", "product owner", "product management"],
  qa: ["quality assurance", " qa ", "test engineer", "qa engineer"],
  security: ["security engineer", "cybersecurity", "application security", "appsec"],
  support: ["support engineer", "technical support", "customer support", "suporte"],
};

export const TECHNOLOGY_PATTERNS = {
  angular: ["angular"], aws: ["aws", "amazon web services"], azure: ["azure"],
  csharp: ["c#", "c sharp"], django: ["django"], docker: ["docker"],
  dotnet: [".net", "dotnet"], flutter: ["flutter"], gcp: ["gcp", "google cloud"],
  go: ["golang", " go "], java: [" java "], javascript: ["javascript", "java script"],
  kotlin: ["kotlin"], kubernetes: ["kubernetes", "k8s"], laravel: ["laravel"],
  mongodb: ["mongodb", "mongo db"], mysql: ["mysql"],
  nextjs: ["next.js", "nextjs", "next js"], nodejs: ["node.js", "nodejs", "node js"],
  php: [" php "], postgres: ["postgresql", "postgres"], python: ["python"],
  react: ["react.js", "reactjs", "react"], "react-native": ["react native"],
  redis: ["redis"], ruby: [" ruby "], rust: [" rust "],
  spring: ["spring boot", "spring"], terraform: ["terraform"],
  typescript: ["typescript", "type script"], vue: ["vue.js", "vuejs", "vue js", " vue "],
};

export const SENIORITY_PATTERNS = {
  internship: ["internship", "intern", "estagio", "estagiario", "trainee"],
  junior: ["junior", " jr "], lead: ["tech lead", "team lead", "technical lead", " lead "],
  mid: ["mid-level", "mid level", "middle", "pleno", "semi senior"],
  principal: ["principal"], senior: ["senior", " sr "], staff: ["staff"],
};

export const EMPLOYMENT_PATTERNS = {
  contractor: ["contractor", " pj ", "prestador"], employee: [" clt ", "employee"],
  "full-time": ["full-time", "full time", "tempo integral"],
  internship: ["internship", "estagio", "trainee"],
  "part-time": ["part-time", "part time", "meio periodo"],
  contract: ["fixed-term", "temporary contract", "contrato temporario"],
};

export const WORK_MODEL_PATTERNS = {
  hybrid: ["hybrid", "hibrido", "hibrida"],
  "on-site": ["on-site", "onsite", "on site", "presencial", "in person"],
  remote: ["remote", "remoto", "remota", "home office", "work from home", "wfh"],
};

export const LANGUAGE_PATTERNS = {
  de: ["german", "alemao", "deutsch"], en: ["english", "ingles"],
  es: ["spanish", "espanhol", "espanol"], fr: ["french", "frances", "francais"],
  it: ["italian", "italiano"], pt: ["portuguese", "portugues"],
};
