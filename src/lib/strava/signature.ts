// Strava webhook signature check, as in Strava's webhook example
// (https://developers.strava.com/docs/webhookexample/): header `X-Strava-Signature: t=<unix>,v1=<hex>`,
// where v1 = HMAC-SHA256(secret, `${t}.${rawBody}`) as hex, and t must be within 5 minutes.
// The main webhook docs don't mention signatures, so it's opt-in via STRAVA_WEBHOOK_SECRET.

const TOLERANCE_SECONDS = 300;

export async function verifySignature(header: string | null, rawBody: string, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => part.trim().split("=", 2)));
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!Number.isFinite(timestamp) || !signature) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${parts.t}.${rawBody}`));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(signature, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
