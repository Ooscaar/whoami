# whoami

Static Astro site deployed to Cloudflare Workers (static assets) at
https://oscarperezcastillo.com. Configured in `cloudflare.config.ts`, with build
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
