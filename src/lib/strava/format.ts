// Display helpers for the activities page.

/**
 * The name shown for a Strava sport type: every kind of bike ride (Ride, MountainBikeRide,
 * GravelRide, …) is "mtb", the rest are spelled out ("TrailRun" → "trail run").
 */
export function sportLabel(sportType: string): string {
  if (/ride/i.test(sportType)) return "mtb";
  return sportType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

/** 12345 m → "12.3 km"; from 100 km on, whole numbers: 2321987 m → "2,322 km" */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km >= 100) return `${Math.round(km).toLocaleString("en-GB")} km`;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
}

/** 107353 → "107,353 m" */
export function formatElevation(meters: number): string {
  return `${Math.round(meters).toLocaleString("en-GB")} m`;
}

/** 3725 s → "1h 02m", 1520 s → "25m" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

const PACE_SPORTS = /run|walk|hike/i;
const SWIM = /swim/i;

/** Pace for runs/walks (min/km), per 100 m for swims, speed (km/h) for everything else. */
export function formatPace(sportType: string, metersPerSecond: number): string | null {
  if (!metersPerSecond) return null;
  const perUnit = (meters: number) => {
    const total = Math.round(meters / metersPerSecond);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };
  if (SWIM.test(sportType)) return `${perUnit(100)} /100m`;
  if (PACE_SPORTS.test(sportType)) return `${perUnit(1000)} /km`;
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
}

export const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "2026-11-07T08:15:00Z" (Strava's local time) → "7 nov" (or "7 nov 2025" outside this year) */
export function formatDate(startDateLocal: string, now = new Date()): string {
  const date = new Date(startDateLocal);
  const label = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return date.getUTCFullYear() === now.getUTCFullYear() ? label : `${label} ${date.getUTCFullYear()}`;
}
