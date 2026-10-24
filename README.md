# Toneflix Collab (toneflix-collab)

A streaming platform that brings together creatives in the music industry to make awesome sounds through collaboration.

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Run the SSR app on Cloudflare Workers

```bash
yarn --cwd src-ssr install
yarn worker:dev       # builds dist/ssr for Workers and serves it with wrangler at http://localhost:8787
yarn worker:deploy    # builds and deploys with wrangler (run `yarn wrangler login` first)
```

The Worker settings live in `wrangler.jsonc`. `yarn build` and `yarn quasar build -m ssr` still produce the regular SPA and Node builds.

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
