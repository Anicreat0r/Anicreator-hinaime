# Anikatsu — GitHub + Cloudflare Pages

This project is prepared for Cloudflare Pages.

## GitHub
Upload the contents of this folder to the root of a GitHub repository. Do not upload the outer ZIP folder as an extra nesting level.

## Cloudflare Pages
Create a Pages project and connect the GitHub repository.

- Framework preset: None
- Build command: leave empty
- Build output directory: `.`
- Root directory: `/`

Cloudflare Pages automatically detects the `functions/` directory and deploys the API routes.

## API routes
- `/api/recent?page=1&per_page=50`
- `/api/series/123`

The Pages Functions proxy these requests to `https://anikotoapi.site` so the browser does not need to call that upstream API directly.

## Important
`server.js` was removed because it used the Worker `fetch()` shape but was placed as a normal project server file. On Pages, the equivalent backend belongs in `functions/`.
