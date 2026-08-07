import config from "@/config";

const siteUrl = config.site.url.replace(/\/?$/, "/");

/** Public identity links for entity consolidation (GEO sameAs). */
const SAME_AS = [
  "https://github.com/s87343472/daily-word-hunt",
];

export function absoluteUrl(path = ""): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\//, "");
  return `${siteUrl}${clean}`;
}

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: config.site.author,
    url: siteUrl,
    sameAs: SAME_AS,
  };
}

export function personAuthorSchema() {
  return {
    "@type": "Person",
    "@id": `${siteUrl}#author`,
    name: config.site.author,
    url: siteUrl,
    sameAs: SAME_AS,
    worksFor: { "@id": `${siteUrl}#organization` },
  };
}

export function webSiteSchema(withContext = true) {
  const node = {
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: config.site.title,
    url: siteUrl,
    description: config.site.description,
    inLanguage: config.site.lang ?? "en",
    publisher: { "@id": `${siteUrl}#organization` },
    author: { "@id": `${siteUrl}#author` },
  };
  return withContext
    ? { "@context": "https://schema.org", ...node }
    : node;
}

export function webApplicationSchema(
  opts?: {
    datePublished?: string;
    dateModified?: string;
  },
  withContext = true
) {
  const node = {
    "@type": "WebApplication",
    "@id": `${siteUrl}#app`,
    name: config.site.title,
    url: siteUrl,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Works best in modern browsers.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: config.site.description,
    inLanguage: config.site.lang ?? "en",
    author: { "@id": `${siteUrl}#author` },
    publisher: { "@id": `${siteUrl}#organization` },
    datePublished: opts?.datePublished,
    dateModified: opts?.dateModified,
  };
  return withContext
    ? { "@context": "https://schema.org", ...node }
    : node;
}

/** Home landing page provenance for AI citation trust. */
export function homeWebPageSchema(opts: {
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@type": "WebPage",
    "@id": `${siteUrl}#webpage`,
    url: siteUrl,
    name: opts.title,
    description: opts.description,
    inLanguage: config.site.lang ?? "en",
    isPartOf: { "@id": `${siteUrl}#website` },
    about: { "@id": `${siteUrl}#app` },
    author: { "@id": `${siteUrl}#author` },
    publisher: { "@id": `${siteUrl}#organization` },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    mainEntity: { "@id": `${siteUrl}#app` },
  };
}

/** Graph bundle for the home page (one script, linked entities). */
export function homeJsonLdGraph(opts: {
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      personAuthorSchema(),
      webSiteSchema(false),
      webApplicationSchema(opts, false),
      homeWebPageSchema(opts),
    ],
  };
}

export function breadcrumbSchema(
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqPageSchema(
  mainEntity: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: mainEntity.map(qa => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
      },
    })),
  };
}

export function howToSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to play Daily Word Hunt",
    description:
      "Find every word in the daily word search grid by dragging or tapping letter endpoints.",
    totalTime: "PT10M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Open today’s puzzle",
        text: "Go to the Daily Word Hunt home page to load today’s free word search.",
        url: siteUrl,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Find words on the list",
        text: "Drag from the first letter to the last, or tap the first letter then the last. Words may run horizontally, vertically, diagonally, and backwards.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Clear the list",
        text: "Continue until every word is found. Use a hint if you are stuck on the last words.",
      },
    ],
  };
}

export function dailyPuzzleSchema(opts: {
  date: string;
  title: string;
  description: string;
  words: string[];
  path?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.title,
    description: opts.description,
    url: absoluteUrl(opts.path ?? `daily/${opts.date}/`),
    datePublished: opts.date,
    dateModified: opts.date,
    author: personAuthorSchema(),
    publisher: organizationSchema(),
    isPartOf: {
      "@type": "WebSite",
      name: config.site.title,
      url: siteUrl,
    },
    about: {
      "@type": "Thing",
      name: "Word search puzzle",
      description: `Words to find: ${opts.words.join(", ")}`,
    },
  };
}
