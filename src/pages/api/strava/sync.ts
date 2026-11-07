// Manual sync (the same job the daily cron runs): POST with `Authorization: Bearer <STRAVA_VERIFY_TOKEN>`.
// Optional `?since=YYYY-MM-DD` backfills from that date instead of the latest stored activity.
// Used by `npm run strava -- sync` for the first backfill and to check the deployed setup.

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { syncRecent } from "../../../lib/strava/sync.ts";

export const prerender = false;

export const POST = (async ({ request, url }) => {
  if (!env.STRAVA_VERIFY_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.STRAVA_VERIFY_TOKEN}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const since = url.searchParams.get("since");
  const sinceSeconds = since ? Date.parse(since) / 1000 : undefined;
  if (sinceSeconds !== undefined && !Number.isFinite(sinceSeconds)) {
    return Response.json({ ok: false, error: "since must be a date (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    return Response.json({ ok: true, ...(await syncRecent(env, { since: sinceSeconds })) });
  } catch (error) {
    console.error("strava sync failed:", error);
    return Response.json({ ok: false, error: String(error) }, { status: 502 });
  }
}) satisfies APIRoute;
