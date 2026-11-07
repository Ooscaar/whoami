// The Worker entrypoint (see cloudflare.config.ts). Astro's adapter builds its own Worker
// into dist/server, which serves the on-demand pages and API routes; this wraps it to add
// the daily cron that keeps the Strava activities in D1 up to date.

// @ts-ignore: built by `astro build` before Wrangler bundles this file.
import astro from "../dist/server/entry.mjs";
import { syncRecent } from "./lib/strava/sync.ts";

export default {
  fetch: astro.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      syncRecent(env).then(
        (result) => console.log(`strava cron (${controller.cron}):`, result),
        (error) => console.error("strava cron failed:", error),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
