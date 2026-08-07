import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://daily-word-hunt.pages.dev/",
    title: "Daily Word Hunt",
    description:
      "Free daily word search in your browser. New puzzle every day — drag or tap to find the words. Print and large print supported.",
    author: "Daily Word Hunt",
    profile: "https://daily-word-hunt.pages.dev/",
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
  // Fill in when the project is public.
  socials: [],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=Daily%20Word%20Hunt&body=" },
  ],
});