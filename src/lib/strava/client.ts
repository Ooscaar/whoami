// A small Strava API v3 client: OAuth (authorize, exchange, refresh) plus the few read
// endpoints the site uses. Plain fetch, no dependencies, so it runs both on the Worker
// and in Node (scripts/strava.ts).
//
// Docs: https://developers.strava.com/docs/authentication/ · https://developers.strava.com/docs/reference/

const OAUTH_URL = "https://www.strava.com/oauth";
const API_URL = "https://www.strava.com/api/v3";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch seconds. */
  expiresAt: number;
}

export interface SummaryAthlete {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  city: string | null;
  country: string | null;
  profile: string;
}

export interface SummaryActivity {
  id: number;
  name: string;
  /** Meters. */
  distance: number;
  /** Seconds. */
  moving_time: number;
  /** Seconds. */
  elapsed_time: number;
  /** Meters. */
  total_elevation_gain: number;
  /** Deprecated by Strava in favour of sport_type, kept for older activities. */
  type: string;
  sport_type: string;
  /** ISO 8601, UTC. */
  start_date: string;
  /** ISO 8601, in the activity's local time (with a misleading "Z"). */
  start_date_local: string;
  timezone: string;
  /** Meters per second. */
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  kudos_count: number;
  achievement_count: number;
  pr_count: number;
  private: boolean;
  /** Returned by the API but not in Strava's documented model, hence optional. */
  visibility?: "everyone" | "followers_only" | "only_me";
  map: { id: string; summary_polyline: string | null };
  athlete: { id: number };
}

export interface RateLimit {
  /** [15-minute, daily] */
  limit: [number, number];
  usage: [number, number];
}

export class StravaError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "StravaError";
    this.status = status;
    this.body = body;
  }
}

/** Where the current tokens live: D1 on the Worker, .env in the CLI. */
export interface TokenStore {
  load(): Promise<Tokens | null>;
  save(tokens: Tokens): Promise<void>;
}

export interface StravaClientOptions {
  clientId: string;
  clientSecret: string;
  tokens: TokenStore;
  /** Tried once if the stored refresh token is rejected (e.g. freshly re-authorized). */
  fallbackRefreshToken?: string;
}

/** Refresh when the access token has less than this left. */
const EXPIRY_MARGIN_SECONDS = 5 * 60;

export class StravaClient {
  readonly clientId: string;
  readonly #clientSecret: string;
  readonly #tokens: TokenStore;
  readonly #fallbackRefreshToken: string | undefined;
  /** Rate-limit headers from the last API call. */
  rateLimit: RateLimit | null = null;

  constructor(options: StravaClientOptions) {
    this.clientId = options.clientId;
    this.#clientSecret = options.clientSecret;
    this.#tokens = options.tokens;
    this.#fallbackRefreshToken = options.fallbackRefreshToken;
  }

  // --- OAuth -------------------------------------------------------------------------

  /** The page you open once in the browser to authorize the app. */
  static authorizeUrl(options: { clientId: string; redirectUri: string; scope: string[] }): string {
    const params = new URLSearchParams({
      client_id: options.clientId,
      redirect_uri: options.redirectUri,
      response_type: "code",
      approval_prompt: "force",
      scope: options.scope.join(","),
    });
    return `${OAUTH_URL}/authorize?${params}`;
  }

  /** Trade the one-time `code` from the redirect for tokens (and the athlete). */
  async exchangeCode(code: string): Promise<{ tokens: Tokens; athlete: SummaryAthlete }> {
    const data = await this.#oauth({ grant_type: "authorization_code", code });
    const tokens = toTokens(data);
    await this.#tokens.save(tokens);
    return { tokens, athlete: data.athlete as SummaryAthlete };
  }

  /**
   * A valid access token, refreshing it if needed. Strava rotates the refresh token on
   * refresh and invalidates the old one immediately, so the new one is saved right away.
   */
  async accessToken(): Promise<string> {
    const stored = await this.#tokens.load();
    if (stored && stored.expiresAt - EXPIRY_MARGIN_SECONDS > Date.now() / 1000) return stored.accessToken;

    const candidates = [stored?.refreshToken, this.#fallbackRefreshToken].filter(
      (token, i, all): token is string => !!token && all.indexOf(token) === i,
    );
    if (candidates.length === 0) throw new Error("No Strava refresh token available.");

    let lastError: unknown;
    for (const refreshToken of candidates) {
      try {
        const tokens = toTokens(await this.#oauth({ grant_type: "refresh_token", refresh_token: refreshToken }));
        await this.#tokens.save(tokens);
        return tokens.accessToken;
      } catch (error) {
        // A rejected token (400/401) may be stale: try the next one. Anything else is real.
        if (!(error instanceof StravaError) || (error.status !== 400 && error.status !== 401)) throw error;
        lastError = error;
      }
    }
    throw lastError;
  }

  // --- API ---------------------------------------------------------------------------

  /** GET /athlete */
  getAthlete(): Promise<SummaryAthlete> {
    return this.#get("/athlete");
  }

  /** GET /athlete/activities: newest first unless `after` is set (then oldest first). */
  listActivities(
    options: { after?: number; before?: number; page?: number; perPage?: number } = {},
  ): Promise<SummaryActivity[]> {
    return this.#get("/athlete/activities", {
      after: options.after,
      before: options.before,
      page: options.page,
      per_page: options.perPage,
    });
  }

  /**
   * Every activity after `after` (epoch seconds), following pages. Strava says a page can come
   * back short without being the last, so this stops at the first empty page.
   */
  async listAllActivities(options: { after?: number; maxPages?: number } = {}): Promise<SummaryActivity[]> {
    const all: SummaryActivity[] = [];
    for (let page = 1; page <= (options.maxPages ?? 20); page++) {
      const batch = await this.listActivities({ after: options.after, page, perPage: 200 }); // 200 is the max.
      if (batch.length === 0) break;
      all.push(...batch);
    }
    return all;
  }

  /** GET /activities/{id}. The detailed activity is a superset of the summary. */
  getActivity(id: number): Promise<SummaryActivity> {
    return this.#get(`/activities/${id}`);
  }

  // --- Internals ---------------------------------------------------------------------

  async #oauth(params: Record<string, string>): Promise<Record<string, unknown>> {
    const response = await fetch(`${OAUTH_URL}/token`, {
      method: "POST",
      body: new URLSearchParams({ client_id: this.clientId, client_secret: this.#clientSecret, ...params }),
    });
    return this.#parse(response, "POST /oauth/token");
  }

  async #get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(API_URL + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const response = await fetch(url, { headers: { Authorization: `Bearer ${await this.accessToken()}` } });
    this.rateLimit = parseRateLimit(response.headers) ?? this.rateLimit;
    return this.#parse(response, `GET ${path}`);
  }

  async #parse<T>(response: Response, what: string): Promise<T> {
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {}
    if (!response.ok) {
      const message = (body as { message?: string })?.message ?? response.statusText;
      throw new StravaError(`${what} failed: ${response.status} ${message}`, response.status, body);
    }
    return body as T;
  }
}

function toTokens(data: Record<string, unknown>): Tokens {
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: data.expires_at as number,
  };
}

/** Prefer the read limits (all our calls are reads); fall back to the overall ones. */
function parseRateLimit(headers: Headers): RateLimit | null {
  const pair = (name: string) => {
    const [a, b] = (headers.get(name) ?? "").split(",").map(Number);
    return Number.isFinite(a) && Number.isFinite(b) ? ([a, b] as [number, number]) : null;
  };
  const limit = pair("X-ReadRateLimit-Limit") ?? pair("X-RateLimit-Limit");
  const usage = pair("X-ReadRateLimit-Usage") ?? pair("X-RateLimit-Usage");
  return limit && usage ? { limit, usage } : null;
}
