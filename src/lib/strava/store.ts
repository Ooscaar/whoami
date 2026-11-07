// D1 storage for the Strava data: the rotating tokens, and the activities the site shows.
// The schema is created on first use (idempotent), so there are no migrations to run.
//
// Anonymised by design: only the sport, date and effort (distance, time, elevation) are stored.
// No names, routes, coordinates, timezones or heart rate ever reach D1, so the site can't leak them.

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
    sport_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    start_date_local TEXT NOT NULL,
    distance REAL NOT NULL,
    moving_time INTEGER NOT NULL,
    elapsed_time INTEGER NOT NULL,
    total_elevation_gain REAL NOT NULL,
    average_speed REAL NOT NULL,
    kudos_count INTEGER NOT NULL DEFAULT 0,
    pr_count INTEGER NOT NULL DEFAULT 0,
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
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  kudos_count: number;
  pr_count: number;
}

/** Activities visible to everyone or to followers end up on the site; "only you" ones never do. */
export function isPublic(activity: SummaryActivity): boolean {
  return !activity.private && activity.visibility !== "only_me";
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
    `INSERT INTO activities (id, sport_type, start_date, start_date_local, distance, moving_time, elapsed_time,
       total_elevation_gain, average_speed, kudos_count, pr_count, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
     ON CONFLICT (id) DO UPDATE SET sport_type = ?2, start_date = ?3, start_date_local = ?4, distance = ?5,
       moving_time = ?6, elapsed_time = ?7, total_elevation_gain = ?8, average_speed = ?9, kudos_count = ?10,
       pr_count = ?11, updated_at = ?12`,
  );
  await db.batch(
    activities.map((a) =>
      statement.bind(
        a.id,
        a.sport_type ?? a.type,
        a.start_date,
        a.start_date_local,
        a.distance,
        a.moving_time,
        a.elapsed_time,
        a.total_elevation_gain,
        a.average_speed,
        a.kudos_count ?? 0,
        a.pr_count ?? 0,
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

export interface DayTotals {
  /** YYYY-MM-DD, local to the activity. */
  day: string;
  count: number;
  distance: number;
  moving_time: number;
  /** Comma-separated sport types that day. */
  sports: string;
}

/** Totals per day for one calendar year (by local start date), for the calendar and monthly chart. */
export async function dayTotals(db: D1Database, year: number): Promise<DayTotals[]> {
  const { results } = await db
    .prepare(
      `SELECT substr(start_date_local, 1, 10) AS day, count(*) AS count, sum(distance) AS distance,
         sum(moving_time) AS moving_time, group_concat(DISTINCT sport_type) AS sports
       FROM activities WHERE substr(start_date_local, 1, 4) = ?1
       GROUP BY day ORDER BY day`,
    )
    .bind(String(year))
    .all<DayTotals>();
  return results;
}
