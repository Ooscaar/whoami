// D1 storage for the Strava data: the rotating tokens, and the activities the site shows.
// The schema is created on first use (idempotent), so there are no migrations to run.

import type { SummaryActivity, TokenStore, Tokens } from "./client.ts";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS strava_tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    sport_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    start_date_local TEXT NOT NULL,
    timezone TEXT,
    distance REAL NOT NULL,
    moving_time INTEGER NOT NULL,
    elapsed_time INTEGER NOT NULL,
    total_elevation_gain REAL NOT NULL,
    average_speed REAL NOT NULL,
    average_heartrate REAL,
    kudos_count INTEGER NOT NULL DEFAULT 0,
    pr_count INTEGER NOT NULL DEFAULT 0,
    summary_polyline TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS activities_start_date ON activities (start_date DESC)`,
];

export async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
}

/** One row per activity, as stored (and read by the page). */
export interface Activity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string | null;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate: number | null;
  kudos_count: number;
  pr_count: number;
  summary_polyline: string | null;
}

/** Only activities visible to everyone on Strava end up on the site. */
export function isPublic(activity: SummaryActivity): boolean {
  return !activity.private && (activity.visibility ?? "everyone") === "everyone";
}

export function d1TokenStore(db: D1Database): TokenStore {
  return {
    async load() {
      const row = await db
        .prepare("SELECT access_token, refresh_token, expires_at FROM strava_tokens WHERE id = 1")
        .first<{ access_token: string; refresh_token: string; expires_at: number }>();
      return row ? { accessToken: row.access_token, refreshToken: row.refresh_token, expiresAt: row.expires_at } : null;
    },
    async save(tokens: Tokens) {
      await db
        .prepare(
          `INSERT INTO strava_tokens (id, access_token, refresh_token, expires_at, updated_at)
           VALUES (1, ?1, ?2, ?3, ?4)
           ON CONFLICT (id) DO UPDATE SET access_token = ?1, refresh_token = ?2, expires_at = ?3, updated_at = ?4`,
        )
        .bind(tokens.accessToken, tokens.refreshToken, tokens.expiresAt, new Date().toISOString())
        .run();
    },
  };
}

export async function upsertActivities(db: D1Database, activities: SummaryActivity[]): Promise<void> {
  if (activities.length === 0) return;
  const now = new Date().toISOString();
  const statement = db.prepare(
    `INSERT INTO activities (id, name, sport_type, start_date, start_date_local, timezone, distance, moving_time,
       elapsed_time, total_elevation_gain, average_speed, average_heartrate, kudos_count, pr_count, summary_polyline, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
     ON CONFLICT (id) DO UPDATE SET name = ?2, sport_type = ?3, start_date = ?4, start_date_local = ?5, timezone = ?6,
       distance = ?7, moving_time = ?8, elapsed_time = ?9, total_elevation_gain = ?10, average_speed = ?11,
       average_heartrate = ?12, kudos_count = ?13, pr_count = ?14, summary_polyline = ?15, updated_at = ?16`,
  );
  await db.batch(
    activities.map((a) =>
      statement.bind(
        a.id,
        a.name,
        a.sport_type ?? a.type,
        a.start_date,
        a.start_date_local,
        a.timezone ?? null,
        a.distance,
        a.moving_time,
        a.elapsed_time,
        a.total_elevation_gain,
        a.average_speed,
        a.average_heartrate ?? null,
        a.kudos_count ?? 0,
        a.pr_count ?? 0,
        a.map?.summary_polyline || null,
        now,
      ),
    ),
  );
}

export async function deleteActivity(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM activities WHERE id = ?1").bind(id).run();
}

/** Start time (epoch seconds) of the newest stored activity, or null if there are none. */
export async function latestStartTime(db: D1Database): Promise<number | null> {
  const row = await db.prepare("SELECT max(start_date) AS latest FROM activities").first<{ latest: string | null }>();
  return row?.latest ? Math.floor(Date.parse(row.latest) / 1000) : null;
}

export async function recentActivities(db: D1Database, limit = 30): Promise<Activity[]> {
  const { results } = await db
    .prepare("SELECT * FROM activities ORDER BY start_date DESC LIMIT ?1")
    .bind(limit)
    .all<Activity>();
  return results;
}

export interface YearTotals {
  sport_type: string;
  count: number;
  distance: number;
  moving_time: number;
  elevation: number;
}

/** Totals per sport for one calendar year (by local start date). */
export async function yearTotals(db: D1Database, year: number): Promise<YearTotals[]> {
  const { results } = await db
    .prepare(
      `SELECT sport_type, count(*) AS count, sum(distance) AS distance, sum(moving_time) AS moving_time,
         sum(total_elevation_gain) AS elevation
       FROM activities WHERE substr(start_date_local, 1, 4) = ?1
       GROUP BY sport_type ORDER BY distance DESC`,
    )
    .bind(String(year))
    .all<YearTotals>();
  return results;
}
