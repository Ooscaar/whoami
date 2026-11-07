import { defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "whoami",
		compatibilityDate: "2026-11-06",
		assets: {
			notFoundHandling: "404-page",
		},
	},
});
