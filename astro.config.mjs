// @ts-check
import { defineConfig, fontProviders } from "astro/config";

// Static output — served by Cloudflare Workers static assets (see cloudflare.config.ts).
export default defineConfig({
  site: "https://oscarperezcastillo.com",
  // Emit photos.html (served at /photos) instead of photos/index.html,
  // so links don't bounce through a /photos -> /photos/ redirect.
  build: { format: "file" },
  trailingSlash: "never",
  // Fetch linked pages in the background as soon as their links are on screen,
  // so client-side navigation is instant.
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Geist Mono",
      cssVariable: "--font-geist-mono",
      weights: [400, 500],
      fallbacks: ["monospace"],
    },
  ],
});
