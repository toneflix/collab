# Toneflix Music

Toneflix Music is a community-driven music platform: where music meets community, creativity and collaboration. People listen, discover artists, make music together in the studio, write songs with a smart songwriting assistant, and release their work.

This repository is the app: the web app (SPA and SSR), the Android and iOS apps, and the admin pages, built with Quasar 3, Vue 3 and Tailwind 4. It talks to the Laravel API in [toneflix/collab-api](https://github.com/toneflix/collab-api).

## Requirements

- Node.js 22 or newer
- Yarn 1 (the repository tracks `yarn.lock`, so use yarn, not npm)
- The API running locally ([API setup](https://github.com/toneflix/collab-api#setup))

## Setup

```bash
git clone git@github.com:toneflix/collab.git
cd collab

yarn install
yarn --cwd src-ssr install
```

The committed `.env` already points at a local API on `http://127.0.0.1:8001`. Put personal overrides in `.env.local`, which stays out of git.

## Run

```bash
yarn dev                  # SPA at http://localhost:9001
yarn quasar dev -m ssr    # SSR at http://localhost:9101
yarn worker:dev           # SSR on Cloudflare Workers at http://localhost:8787
yarn dev:android          # Android app
```

Sign in with `admin@toneflix.ng` / `password` once the API is seeded. Admin pages are under `/admin`.

## Checks

```bash
yarn lint
yarn typecheck
yarn test
yarn build
```

## Documentation

The full guides (app and API setup, `.env` reference, mobile builds, production deploy and every feature) live in the API repository's [`docs/`](https://github.com/toneflix/collab-api/tree/main/docs). Good places to start: [App: local setup](https://github.com/toneflix/collab-api/blob/main/docs/guide/app-local.md), [App .env](https://github.com/toneflix/collab-api/blob/main/docs/reference/app-env.md) and [Android](https://github.com/toneflix/collab-api/blob/main/docs/guide/android.md).
