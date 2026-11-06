// @ts-check
import { defineConfig, fontProviders } from "astro/config";

// Static output — served by Cloudflare Workers static assets (see wrangler.jsonc).
export default defineConfig({
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
