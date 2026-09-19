# Anicreator / Anikatsu

Static anime catalog frontend with Cloudflare Pages Functions.

## Cloudflare Pages settings

- Production branch: `main`
- Framework preset: None
- Build command: `exit 0`
- Build output directory: `.`
- Root directory: `/`

## Functions

- `/api/recent` -> `functions/api/recent.js`
- `/api/series/:id` -> `functions/api/series/[id].js`

The `_routes.json` file limits Pages Functions invocation to `/api/*`; the rest of the site is served as static assets.

## Notes

`server.js` is intentionally not included. Cloudflare Pages uses the `functions/` directory for server-side routes.
