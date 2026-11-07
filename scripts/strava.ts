// Standalone Strava CLI: sets up the credentials in .env, checks they work, pushes them to the
// Worker and manages the webhook subscription. Runs on plain Node (>= 22.18 strips the types).
//
//   npm run strava -- <command>     (run without a command for help)

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { StravaClient, StravaError, type TokenStore } from "../src/lib/strava/client.ts";

const ENV_FILE = new URL("../.env", import.meta.url);
const WORKER = "whoami";
const DEFAULT_SITE_URL = "https://oscarperezcastillo.com";
// `activity:read` (not read_all): public + followers activities, without privacy-zone data.
const SCOPE = ["read", "activity:read"];
const REDIRECT_URI = "http://localhost";

// --- .env ------------------------------------------------------------------------------

function readEnv(): Record<string, string> {
  if (!existsSync(ENV_FILE)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
}

/** Update keys in place, keeping comments and order; new keys go at the end. */
function writeEnv(updates: Record<string, string>): void {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split("\n") : [];
  const pending = new Map(Object.entries(updates));
  const next = lines.map((line) => {
    const key = line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    if (key && pending.has(key)) {
      const value = pending.get(key)!;
      pending.delete(key);
      return `${key}=${value}`;
    }
    return line;
  });
  while (next.length && next.at(-1) === "") next.pop();
  for (const [key, value] of pending) next.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, next.join("\n") + "\n", { mode: 0o600 });
}

function required(env: Record<string, string>, ...keys: string[]): void {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length) fail(`Missing in .env: ${missing.join(", ")} (see .env.example).`);
}

/** The CLI keeps its tokens in .env, saving every rotated refresh token. */
const envTokenStore: TokenStore = {
  async load() {
    const env = readEnv();
    if (!env.STRAVA_REFRESH_TOKEN) return null;
    return {
      accessToken: env.STRAVA_ACCESS_TOKEN ?? "",
      refreshToken: env.STRAVA_REFRESH_TOKEN,
      expiresAt: Number(env.STRAVA_ACCESS_TOKEN_EXPIRES_AT ?? 0),
    };
  },
  async save(tokens) {
    const previous = readEnv().STRAVA_REFRESH_TOKEN;
    writeEnv({
      STRAVA_ACCESS_TOKEN: tokens.accessToken,
      STRAVA_ACCESS_TOKEN_EXPIRES_AT: String(tokens.expiresAt),
      STRAVA_REFRESH_TOKEN: tokens.refreshToken,
    });
    if (previous && previous !== tokens.refreshToken) {
      warn("Strava rotated the refresh token; .env now has the new one. Run `secrets` so the Worker has it too.");
    }
  },
};

function client(env = readEnv()): StravaClient {
  required(env, "STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET");
  return new StravaClient({
    clientId: env.STRAVA_CLIENT_ID,
    clientSecret: env.STRAVA_CLIENT_SECRET,
    tokens: envTokenStore,
  });
}

// --- Output ----------------------------------------------------------------------------

const ok = (message: string) => console.log(`\x1b[32m✓\x1b[0m ${message}`);
const warn = (message: string) => console.log(`\x1b[33m!\x1b[0m ${message}`);
const info = (message: string) => console.log(`  ${message}`);

function fail(message: string): never {
  console.error(`\x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

const mask = (value: string) => (value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "****");

// --- Commands --------------------------------------------------------------------------

const commands: Record<string, { usage: string; run: (args: string[]) => Promise<void> }> = {
  "auth-url": {
    usage: "auth-url                Print the Strava authorize link (open it, approve, copy the redirect URL)",
    async run() {
      const env = readEnv();
      required(env, "STRAVA_CLIENT_ID");
      console.log(StravaClient.authorizeUrl({ clientId: env.STRAVA_CLIENT_ID, redirectUri: REDIRECT_URI, scope: SCOPE }));
      info("");
      info("After approving, the browser lands on http://localhost/?...&code=... (the page won't load, that's fine).");
      info("Copy that whole URL and run: npm run strava -- exchange '<url>'");
    },
  },

  exchange: {
    usage: "exchange <url|code>     Trade the code from the redirect for tokens; saves them to .env",
    async run([input]) {
      if (!input) fail("Pass the redirect URL (or just the code).");
      const url = input.startsWith("http") ? new URL(input) : null;
      if (url?.searchParams.get("error")) fail(`Strava returned: ${url.searchParams.get("error")}`);
      const code = url ? url.searchParams.get("code") : input;
      if (!code) fail("No `code` in that URL.");

      const granted = (url?.searchParams.get("scope") ?? "").split(/[ ,]/).filter(Boolean);
      if (url && !granted.includes("activity:read") && !granted.includes("activity:read_all")) {
        fail(`activity:read wasn't granted (got: ${granted.join(", ") || "nothing"}). Re-run auth-url and keep it checked.`);
      }
      if (granted.includes("activity:read_all")) {
        warn("activity:read_all was granted: that includes privacy-zone data. Prefer re-authorizing with activity:read.");
      }

      const { athlete } = await client().exchangeCode(code);
      writeEnv({ STRAVA_ATHLETE_ID: String(athlete.id) });
      ok(`Authorized as ${athlete.firstname} ${athlete.lastname} (athlete ${athlete.id}); tokens saved to .env.`);
    },
  },

  "verify-token": {
    usage: "verify-token [--force]  Generate STRAVA_VERIFY_TOKEN (webhook check + manual sync auth)",
    async run(args) {
      if (readEnv().STRAVA_VERIFY_TOKEN && !args.includes("--force")) {
        return ok("STRAVA_VERIFY_TOKEN already set (use --force to rotate it).");
      }
      writeEnv({ STRAVA_VERIFY_TOKEN: randomBytes(24).toString("base64url") });
      ok("STRAVA_VERIFY_TOKEN generated in .env.");
    },
  },

  check: {
    usage: "check                   Validate .env and read your profile + latest activities from Strava",
    async run() {
      const env = readEnv();
      if (!existsSync(ENV_FILE)) fail("No .env yet: cp .env.example .env");
      required(env, "STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REFRESH_TOKEN");
      for (const key of ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REFRESH_TOKEN", "STRAVA_ATHLETE_ID", "STRAVA_VERIFY_TOKEN"]) {
        if (env[key]) ok(`${key} = ${key === "STRAVA_CLIENT_ID" || key === "STRAVA_ATHLETE_ID" ? env[key] : mask(env[key])}`);
        else warn(`${key} is not set`);
      }

      const strava = client(env);
      const athlete = await strava.getAthlete();
      ok(`GET /athlete → ${athlete.firstname} ${athlete.lastname} (${athlete.id})`);
      if (env.STRAVA_ATHLETE_ID && env.STRAVA_ATHLETE_ID !== String(athlete.id)) {
        warn(`STRAVA_ATHLETE_ID in .env (${env.STRAVA_ATHLETE_ID}) doesn't match; the webhook would ignore your events.`);
      }

      const activities = await strava.listActivities({ perPage: 5 });
      ok(`GET /athlete/activities → ${activities.length} latest:`);
      for (const a of activities) {
        const km = (a.distance / 1000).toFixed(1);
        info(`${a.start_date_local.slice(0, 10)}  ${a.sport_type.padEnd(14)} ${km.padStart(6)} km  ${a.name}${a.private || a.visibility === "only_me" ? "  (only you, hidden on the site)" : ""}`);
      }

      if (strava.rateLimit) {
        const { usage, limit } = strava.rateLimit;
        ok(`Rate limit (reads): ${usage[0]}/${limit[0]} per 15 min, ${usage[1]}/${limit[1]} today`);
      }
    },
  },

  secrets: {
    usage: "secrets                 Push the Strava values from .env to the deployed Worker's secrets",
    async run() {
      const env = readEnv();
      const keys = ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REFRESH_TOKEN", "STRAVA_ATHLETE_ID", "STRAVA_VERIFY_TOKEN"];
      required(env, ...keys);
      for (const key of keys) {
        execFileSync("npx", ["cf", "workers", "secrets", "update", key, "--worker", WORKER, "--type", "secret_text", "--text", env[key], "--quiet"], {
          stdio: ["ignore", "ignore", "inherit"],
        });
        ok(`${key} set on ${WORKER}`);
      }
    },
  },

  sync: {
    usage: "sync [--since=YYYY-MM-DD] [--url=<site>]  Run the sync on the site now (e.g. --since=2026-01-01 to backfill 2026)",
    async run(args) {
      const env = readEnv();
      required(env, "STRAVA_VERIFY_TOKEN");
      const site = siteUrl(args, env);
      const since = args.find((arg) => arg.startsWith("--since="))?.slice("--since=".length);
      const response = await fetch(`${site}/api/strava/sync${since ? `?since=${encodeURIComponent(since)}` : ""}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.STRAVA_VERIFY_TOKEN}` },
      });
      const body = await response.text();
      if (!response.ok) fail(`POST ${site}/api/strava/sync → ${response.status}: ${body}`);
      ok(`POST ${site}/api/strava/sync${since ? `?since=${since}` : ""} → ${body}`);
    },
  },

  webhook: {
    usage: "webhook <status|subscribe|list|delete <id>> [--url=<site>]  Manage the Strava webhook subscription",
    async run([action, id, ...rest]) {
      const env = readEnv();
      required(env, "STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET");
      const credentials = { client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET };
      const endpoint = "https://www.strava.com/api/v3/push_subscriptions";
      const callback = `${siteUrl([id, ...rest].filter(Boolean), env)}/api/strava/webhook`;
      const subscriptions = async () => {
        const response = await fetch(`${endpoint}?${new URLSearchParams(credentials)}`);
        if (!response.ok) fail(`Listing subscriptions failed (${response.status}): ${await response.text()}`);
        return (await response.json()) as { id: number; callback_url: string; created_at: string }[];
      };

      if (action === "list") {
        return console.log(JSON.stringify(await subscriptions(), null, 2));
      }
      if (action === "status") {
        // 1. Is there a subscription, and does it point at this site?
        const subs = await subscriptions();
        if (subs.length === 0) warn("No webhook subscription. Run: npm run strava -- webhook subscribe");
        for (const sub of subs) {
          if (sub.callback_url === callback) ok(`Subscribed (id ${sub.id}, since ${sub.created_at}) → ${sub.callback_url}`);
          else warn(`Subscription ${sub.id} points elsewhere: ${sub.callback_url}`);
        }
        // 2. Does the callback answer Strava's validation the way Strava expects?
        required(env, "STRAVA_VERIFY_TOKEN");
        const challenge = randomBytes(8).toString("hex");
        const query = new URLSearchParams({ "hub.mode": "subscribe", "hub.challenge": challenge, "hub.verify_token": env.STRAVA_VERIFY_TOKEN });
        const started = Date.now();
        const response = await fetch(`${callback}?${query}`);
        const elapsed = Date.now() - started;
        const body = (await response.json().catch(() => null)) as Record<string, string> | null;
        if (response.ok && body?.["hub.challenge"] === challenge) ok(`Callback echoes the challenge (${elapsed} ms; Strava allows 2 s)`);
        else fail(`Callback check failed (${response.status}): ${JSON.stringify(body)}. Is STRAVA_VERIFY_TOKEN the same on the Worker (run \`secrets\`)?`);
        return;
      }
      if (action === "subscribe") {
        required(env, "STRAVA_VERIFY_TOKEN");
        const existing = (await subscriptions()).find((sub) => sub.callback_url === callback);
        if (existing) return ok(`Already subscribed (id ${existing.id}) → ${callback}`);
        // Strava validates the callback (GET with hub.challenge) before answering this request.
        const response = await fetch(endpoint, {
          method: "POST",
          body: new URLSearchParams({ ...credentials, callback_url: callback, verify_token: env.STRAVA_VERIFY_TOKEN }),
        });
        const body = await response.text();
        if (!response.ok) fail(`Subscribe failed (${response.status}): ${body}`);
        return ok(`Subscribed ${callback} → ${body}`);
      }
      if (action === "delete" && id) {
        const response = await fetch(`${endpoint}/${id}?${new URLSearchParams(credentials)}`, { method: "DELETE" });
        if (response.status !== 204) fail(`Delete failed (${response.status}): ${await response.text()}`);
        return ok(`Deleted subscription ${id}`);
      }
      fail("Usage: webhook status | webhook subscribe [--url=<site>] | webhook list | webhook delete <id>");
    },
  },
};

function siteUrl(args: string[], env: Record<string, string>): string {
  const flag = args.find((arg) => arg.startsWith("--url="))?.slice("--url=".length);
  return (flag || env.STRAVA_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

const [name, ...args] = process.argv.slice(2);
const command = commands[name];
if (!command) {
  console.log("Usage: npm run strava -- <command>\n");
  for (const { usage } of Object.values(commands)) console.log(`  ${usage}`);
  console.log("\nSetup: cp .env.example .env → fill STRAVA_CLIENT_ID/SECRET → auth-url → exchange → verify-token → check → secrets → sync --since=2026-01-01 → webhook subscribe");
  process.exit(name ? 1 : 0);
}

try {
  await command.run(args);
} catch (error) {
  fail(error instanceof StravaError ? `${error.message}\n  ${JSON.stringify(error.body)}` : String(error));
}
