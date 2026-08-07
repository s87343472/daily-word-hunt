import config from "@/config";

const siteUrl = config.site.url.replace(/\/?$/, "/");

export function absoluteUrl(path = ""): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\//, "");
  return `${siteUrl}${clean}`;
}

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.site.title,
    url: siteUrl,
    description: config.site.description,
    inLanguage: config.site.lang ?? "en",
    publisher: {
      "@type": "Organization",
      name: config.site.author,
      url: siteUrl,
    },
  };
}

export function webApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: config.site.title,
    url: siteUrl,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: config.site.description,
    inLanguage: config.site.lang ?? "en",
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
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.title,
    description: opts.description,
    url: absoluteUrl(`daily/${opts.date}/`),
    datePublished: opts.date,
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
