# whoami

Astro site deployed to Cloudflare Workers at https://oscarperezcastillo.com.
Pages are static, except `/activities` and `/api/strava/*`, which run on the
Worker through `@astrojs/cloudflare`. Configured in `cloudflare.config.ts`, with build
settings in `wrangler.config.ts`.

```sh
npm install
npm run dev      # local dev server
npm run preview  # build + run on the Workers runtime locally
npm run deploy   # build with Wrangler + cf deploy
```

`cf build` can't build Astro 6+ during the cf beta, so `deploy` builds the
Build Output with Wrangler (`npm run cf:build`) and deploys it with
`cf deploy --prebuilt`.

## Strava activities

`/activities` lists my public Strava activities from D1 (`whoami-db`). Visitors
never call Strava: the data is kept in sync by

- a **webhook** (`/api/strava/webhook`): Strava posts each create/update/delete,
- a **daily cron** (`src/worker.ts`, 04:00 UTC) as a safety net and first backfill,
- `POST /api/strava/sync` to run that same sync on demand.

Code lives in `src/lib/strava/`: `client.ts` (small API client: OAuth + reads),
`store.ts` (D1 schema and queries, created on first use), `sync.ts`. Strava
rotates the refresh token on every refresh, so the Worker keeps the current one
in D1; the `STRAVA_REFRESH_TOKEN` secret only bootstraps the first refresh.

### Setup (`npm run strava`)

A standalone CLI (`scripts/strava.ts`) reads and writes `.env` (gitignored):

```sh
cp .env.example .env                  # then fill STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET
npm run strava -- auth-url            # open it, approve, copy the localhost redirect URL
npm run strava -- exchange '<url>'    # saves the refresh token + athlete ID
npm run strava -- verify-token        # generates STRAVA_VERIFY_TOKEN
npm run strava -- check               # reads your profile + latest activities
npm run strava -- secrets             # pushes the values to the Worker's secrets
npm run strava -- sync                # first backfill on the live site
npm run strava -- webhook subscribe   # register the webhook (one per app)
```

Locally, `npm run preview` picks up `.env` as the Worker's secrets.
