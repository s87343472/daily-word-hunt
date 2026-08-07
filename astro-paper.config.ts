import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://words.sagasu.art/",
    title: "Daily Word Hunt",
    // Keep 140–160 chars for SERP snippet tools (spaces count).
    description:
      "Free daily word search puzzle online. New grid every day—drag or tap to find the words. No account required. Print & large print supported.",
    author: "Daily Word Hunt",
    profile: "https://words.sagasu.art/",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/New_York",
    dir: "ltr",
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
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=Daily%20Word%20Hunt&body=" },
  ],
});