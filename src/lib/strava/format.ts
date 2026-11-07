// Display helpers for the activities page.

/** "TrailRun" → "trail run" */
export function sportLabel(sportType: string): string {
  return sportType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

/** 12345 m → "12.3 km" */
export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
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

/** "2026-11-07T08:15:00Z" (Strava's local time) → "7 nov" (or "7 nov 2025" outside this year) */
export function formatDate(startDateLocal: string, now = new Date()): string {
  const date = new Date(startDateLocal);
  const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
  return date
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric", timeZone: "UTC" })
    .toLowerCase();
}

/** Google's encoded polyline format → [lat, lng] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** An SVG path for the route, fitted (keeping its proportions) into a size × size box. */
export function routePath(encoded: string, size: number, padding = 2): string | null {
  const points = decodePolyline(encoded);
  if (points.length < 2) return null;
  // Longitude degrees shrink towards the poles: scale x so the shape isn't stretched.
  const meanLat = points.reduce((sum, [lat]) => sum + lat, 0) / points.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);
  const xy = points.map(([lat, lng]) => [lng * kx, -lat]);
  const xs = xy.map(([x]) => x);
  const ys = xy.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = (size - padding * 2) / Math.max(maxX - minX, maxY - minY, 1e-9);
  const offsetX = (size - (maxX - minX) * scale) / 2;
  const offsetY = (size - (maxY - minY) * scale) / 2;
  return xy
    .map(([x, y], i) => `${i ? "L" : "M"}${((x - minX) * scale + offsetX).toFixed(1)} ${((y - minY) * scale + offsetY).toFixed(1)}`)
    .join("");
}
