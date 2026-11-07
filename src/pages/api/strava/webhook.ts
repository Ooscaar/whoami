// Strava webhook callback: https://developers.strava.com/docs/webhooks/
// GET answers the one-time subscription check; POST receives events, which must be
// acknowledged within 2 seconds, so the actual sync runs after the response (waitUntil).

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { verifySignature } from "../../../lib/strava/signature.ts";
import { syncEvent, type WebhookEvent } from "../../../lib/strava/sync.ts";

export const prerender = false;

export const GET = (({ url }) => {
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (url.searchParams.get("hub.mode") !== "subscribe" || !challenge || token !== env.STRAVA_VERIFY_TOKEN) {
    return new Response("Forbidden", { status: 403 });
  }
  return Response.json({ "hub.challenge": challenge });
}) satisfies APIRoute;

export const POST = (async ({ request, locals }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Strava-Signature");

  // Optional (not declared in cloudflare.config.ts, so deploys don't require it): once set,
  // only events signed by Strava are accepted. Until then, log whether Strava signs them.
  const secret = (env as unknown as Record<string, string | undefined>).STRAVA_WEBHOOK_SECRET;
  if (secret) {
    if (!(await verifySignature(signature, rawBody, secret))) return new Response("Forbidden", { status: 403 });
  } else {
    console.log(`strava webhook: ${signature ? "signed" : "unsigned"} event (STRAVA_WEBHOOK_SECRET not set)`);
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  // Even unsigned, a forged event can't inject data: only our own athlete's events are acted
  // on, and the activity itself is always fetched from Strava, never taken from the body.
  locals.cfContext.waitUntil(
    syncEvent(env, event).then(
      (result) => console.log(`strava webhook: ${event.aspect_type} ${event.object_type} ${event.object_id} → ${result}`),
      (error) => console.error("strava webhook failed:", error),
    ),
  );
  return new Response("EVENT_RECEIVED");
}) satisfies APIRoute;
