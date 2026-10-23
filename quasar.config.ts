// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app';

export default defineConfig((ctx) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['prototypes', 'main', 'vuestic', 'alova', 'i18n'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['~vuestic-ui/css', 'overwrite.scss', 'app.scss', 'tailwind.css'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      'fontawesome-v7',
      'eva-icons',
      'roboto-font', // optional, you are not bound to it
      'material-icons-outlined',
      'material-icons', // optional, you are not bound to it
    ],

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

      // Variables in .env files that start with "v_" are exposed to the app
      env: {
        clientPrefix: 'v_',
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
      },

      // Quasar plugins
      plugins: ['Dark', 'Meta', 'Notify', 'Dialog', 'Cookies'],
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
