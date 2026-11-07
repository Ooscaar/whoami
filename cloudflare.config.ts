import { bindings, defineConfig, triggers } from "cf/config";

export default defineConfig({
	worker: {
		name: "whoami",
		compatibilityDate: "2026-11-06",
		// Wraps Astro's server build (dist/server) and adds the Strava cron.
		entrypoint: "./src/worker.ts",
		domains: ["oscarperezcastillo.com"],
		assets: {
			notFoundHandling: "404-page",
			// On-demand routes: without this, browser navigations (Sec-Fetch-Mode: navigate) to a
			// path with no static file get the 404 page instead of reaching the Worker.
			runWorkerFirst: ["/activities", "/api/*"],
		},
		env: {
			// Astro serves static files and its 404 page through this binding.
			ASSETS: bindings.assets(),
			// Strava activities + the rotating refresh token (see src/lib/strava/store.ts).
			DB: bindings.d1({ id: "67b61f59-8650-4fab-93df-f5d2ed9d60db", name: "whoami-db" }),
			// Set from .env with `npm run strava -- secrets`.
			STRAVA_CLIENT_ID: bindings.secret(),
			STRAVA_CLIENT_SECRET: bindings.secret(),
			STRAVA_REFRESH_TOKEN: bindings.secret(),
			STRAVA_ATHLETE_ID: bindings.secret(),
			STRAVA_VERIFY_TOKEN: bindings.secret(),
		},
		// Daily safety net for anything the webhook missed (UTC).
		triggers: [triggers.scheduled({ schedule: "0 4 * * *" })],
	},
});
