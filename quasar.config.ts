// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const isWorkersBuild = process.env.SSR_TARGET === 'cloudflare';

export default defineConfig((ctx) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['prototypes', 'main', 'icons', 'alova', 'i18n', 'images', ...(ctx.mode.capacitor ? ['native'] : [])],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: [
      '~@fontsource-variable/inter/index.css',
      'tokens.css',
      'components.scss',
      'overwrite.scss',
      'app.scss',
      'tailwind.css',
    ],

    // Icons come from Lucide (src/icons), so no icon fonts are loaded
    extras: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node22',
      },

      typescript: {
        // Quasar's "strict" also turns on exactOptionalPropertyTypes and
        // noUncheckedIndexedAccess; plain TypeScript strict mode is used instead.
        strict: false,
        vueShim: true,
        extendTsConfig(tsConfig) {
          tsConfig.compilerOptions = { ...tsConfig.compilerOptions, strict: true };
        },
      },

      vueRouterMode: 'history', // available values: 'hash', 'history'

      // Keep the folder import paths (src/..., layouts/..., etc.) that Quasar CLI v2 provided
      alias: {
        src: ctx.appPaths.srcDir,
        app: ctx.appPaths.appDir,
        components: ctx.appPaths.resolve.src('components'),
        layouts: ctx.appPaths.resolve.src('layouts'),
        pages: ctx.appPaths.resolve.src('pages'),
        assets: ctx.appPaths.resolve.src('assets'),
        boot: ctx.appPaths.resolve.src('boot'),
        stores: ctx.appPaths.resolve.src('stores'),
      },

      // Variables in .env files that start with "VITE_" are exposed to the app
      env: {
        clientPrefix: 'VITE_',
      },

      // The Cloudflare Workers build bundles the server's dependencies with their Node builds,
      // since wrangler would otherwise pick their browser builds. Vue stays shared with the webserver.
      extendViteConf(viteConf, { isServer }) {
        if (isServer && isWorkersBuild) {
          viteConf.ssr = {
            ...viteConf.ssr,
            noExternal: true,
            external: ['vue', 'vue/server-renderer'],
          };
        }
      },

      // The Worker renders every page, so the Workers build drops the SPA fallback in public/_redirects
      async afterBuild({ quasarConf }) {
        if (isWorkersBuild && quasarConf.build?.distDir) {
          await rm(join(quasarConf.build.distDir, 'client', '_redirects'), { force: true });
        }
      },

      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            vueTsc: true,
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      open: true, // opens browser window automatically
      port: ctx.modeName === 'ssr' ? 9101 : 9001,
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {
        dark: true,
        // Flat buttons and items, without Material's ripple
        ripple: false,
        // Shows that a clicked link is loading while the next page fetches its data
        loadingBar: { color: 'primary', size: '2px', position: 'top' },
      },

      // Quasar plugins
      plugins: ['Dark', 'Meta', 'Notify', 'Dialog', 'Cookies', 'LoadingBar'],
    },

    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
      middlewares: [
        'render', // keep this as last one
      ],
      pwa: false,
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager', // 'packager' or 'builder'
      packager: {},
      builder: {
        appId: 'toneflix-collab',
      },
    },
  };
});
