import { defineConfig, envField, svgoOptimizer } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";

function todayInSiteTz(): string {
  const tz = config.site.timezone ?? "UTC";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sitemapInclude(page: string): boolean {
  // Tool / thin surfaces
  if (page.includes("/search")) return false;
  // Blog monthly archives off in product nav
  if (
    config.features?.showArchives === false &&
    page.includes("/archives")
  ) {
    return false;
  }
  // Legacy redirects are empty shells if ever emitted
  if (page.endsWith("/play/") || page.includes("/play/print")) return false;

  // Unreleased calendar stock: keep out of sitemap until calendar day
  const dated = page.match(
    /\/(?:daily|packs\/[^/]+)\/(\d{4}-\d{2}-\d{2})\/?$/
  );
  if (dated && dated[1] > todayInSiteTz()) return false;

  return true;
}

export default defineConfig({
  site: config.site.url,
  integrations: [
    mdx(),
    sitemap({
      filter: sitemapInclude,
    }),
  ],
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [rehypeCallouts],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  // No Google Fonts at build time — Node may not reach fonts.google.com
  // (browser can; different network/proxy). Use system stack in theme.css.
  fonts: [],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      /** Plausible site domain, e.g. words.sagasu.art (cookieless; always when set) */
      PUBLIC_PLAUSIBLE_DOMAIN: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      /**
       * GA4 measurement id G-XXXX — baked into <head> with Consent Mode v2
       * (default denied → cookieless pings; Accept → granted). Required at
       * build time for Google installer detection on static HTML.
       */
      PUBLIC_GA_MEASUREMENT_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
