import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://words.sagasu.art/",
    /** Product name — keep stable for SEO/brand; domain is words.sagasu.art */
    title: "Daily Word Hunt",
    // Keep 140–160 chars for SERP snippet tools (spaces count).
    description:
      "Free daily word search puzzle online. A new grid every day—drag or tap to find the words. No account required. Print packs & large print supported.",
    author: "Daily Word Hunt",
    profile: "https://words.sagasu.art/",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/New_York",
    dir: "ltr",
    contactEmail: "support@sagasu.art",
  },
  posts: {
    perPage: 6,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    // Blog-style monthly archives off; use /past for daily puzzles.
    showArchives: false,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/s87343472/daily-word-hunt" },
    {
      name: "mail",
      url: "mailto:support@sagasu.art",
      linkTitle: "Email Daily Word Hunt support",
    },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=Daily%20Word%20Hunt&body=" },
  ],
});