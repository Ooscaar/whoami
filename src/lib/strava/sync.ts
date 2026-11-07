// Keeps D1 in sync with Strava. Two entry points:
// - syncRecent: the daily cron (and POST /api/strava/sync). Backfills everything the first
//   time, then only asks for activities newer than the latest stored one.
// - syncEvent: one webhook event (create / update / delete / deauthorization).

import { StravaClient } from "./client.ts";
import {
  d1TokenStore,
  deleteActivity,
  ensureSchema,
  isPublic,
  latestStartTime,
  upsertActivities,
} from "./store.ts";

/** The bindings the sync needs (see cloudflare.config.ts). */
export interface StravaEnv {
  DB: D1Database;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  STRAVA_REFRESH_TOKEN: string;
  STRAVA_ATHLETE_ID: string;
}

/** https://developers.strava.com/docs/webhooks/ */
export interface WebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  /** Values are documented as strings ("true"/"false"); compared via String() in case they're booleans. */
  updates?: Record<string, string | boolean>;
}

function client(env: StravaEnv): StravaClient {
  return new StravaClient({
    clientId: env.STRAVA_CLIENT_ID,
    clientSecret: env.STRAVA_CLIENT_SECRET,
    tokens: d1TokenStore(env.DB),
    // The secret bootstraps the very first refresh; after that D1 holds the rotated token.
    fallbackRefreshToken: env.STRAVA_REFRESH_TOKEN,
  });
}

export async function syncRecent(env: StravaEnv): Promise<{ fetched: number; stored: number; backfill: boolean }> {
  await ensureSchema(env.DB);
  const latest = await latestStartTime(env.DB);
  const activities = await client(env).listAllActivities({ after: latest ?? undefined });
  const visible = activities.filter(isPublic);
  await upsertActivities(env.DB, visible);
  return { fetched: activities.length, stored: visible.length, backfill: latest === null };
}

export async function syncEvent(env: StravaEnv, event: WebhookEvent): Promise<string> {
  if (String(event.owner_id) !== env.STRAVA_ATHLETE_ID) return "ignored: other athlete";
  await ensureSchema(env.DB);

  if (event.object_type === "athlete") {
    // You revoked the app on Strava: drop everything, as the API Agreement asks.
    if (String(event.updates?.authorized) === "false") {
      await env.DB.batch([env.DB.prepare("DELETE FROM activities"), env.DB.prepare("DELETE FROM strava_tokens")]);
      return "deauthorized: data deleted";
    }
    return "ignored: athlete update";
  }

  const id = event.object_id;
  if (event.aspect_type === "delete" || String(event.updates?.private) === "true") {
    await deleteActivity(env.DB, id);
    return `deleted ${id}`;
  }

  const activity = await client(env).getActivity(id);
  if (!isPublic(activity)) {
    await deleteActivity(env.DB, id);
    return `deleted ${id} (not public)`;
  }
  await upsertActivities(env.DB, [activity]);
  return `stored ${id}`;
}
