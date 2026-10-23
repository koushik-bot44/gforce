# G-Force IT website

The active Astro rebuild is here. The HTML site in the parent directory is the
legacy version. Start with `PROJECT_HANDOFF.md`, `PRODUCT.md`, `DESIGN.md` and
`REVIEW.md` for recovered requirements, current direction and verification.

## Run locally

Use Node.js 24.x, matching the deployment version in `package.json`.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4321
```

To inspect the production build:

```sh
npm run build
npm run check:tokens
npm run preview -- --host 127.0.0.1 --port 4404
```

## Integrations and content

Copy `.env.example` to `.env` and add the client form endpoint and booking URL
when supplied, then rebuild. Blank values intentionally open a pre-filled email
instead of claiming that a server accepted an enquiry. No live messages were
sent during review.

Confirmed company details, claims, proof and course information belong in
`src/data/site.ts`. Unverified proof is omitted until real content is supplied.
The original source assets remain available; active media is selected through
`src/data/media*.json`. Credits are in both `MEDIA_LICENSES` documents.

## Artwork and media

`src/lib/hero-scene.ts` is shared by the live Three.js sculpture and its posters.
After editing geometry, material or framing, regenerate matching posters with a
running dev server, Playwright and Chrome:

```sh
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs node scripts/render-hero.mjs
```

Reproduce licensed media encodes from downloaded originals:

```sh
GFORCE_FFMPEG=/path/to/ffmpeg GFORCE_MEDIA_SOURCE_DIR=/path/to/originals node scripts/prepare-air-media.mjs
```

Add `GFORCE_MEDIA_ONLY=video` to re-encode just the films. Downloaded originals
and private reference-study footage are kept outside the shipping site.
