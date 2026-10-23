import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import pluginQuasar from '@quasar/app-vite/eslint';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting';

export default defineConfigWithVueTs(
  {
    /**
     * pluginQuasar.configs.recommended() already ignores node_modules, dist,
     * .quasar and the other Quasar generated folders.
     */
    ignores: ['models/**'],
  },

  pluginQuasar.configs.recommended(),
  js.configs.recommended,

  // https://eslint.vuejs.org/rules/#available-rules
  pluginVue.configs['flat/essential'],

  // https://github.com/vuejs/eslint-config-typescript
  vueTsConfigs.recommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      globals: {
        ...globals.browser,
        ...globals.node, // SSR, Electron, config files
        process: 'readonly', // process.env.*
        ga: 'readonly', // Google Analytics
        cordova: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly', // BEX related
        browser: 'readonly', // BEX related
      },
    },

    // add your custom rules here
    rules: {
      'prefer-promise-reject-errors': 'off',
      quotes: ['warn', 'single', { avoidEscape: true }],

      // The core rule does not understand TypeScript types
      'no-unused-vars': 'off',

      // The codebase uses `cond && doSomething()` and ternaries as statements
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],

      // A few components are written in plain JavaScript
      'vue/block-lang': 'off',

      // allow debugger during development only
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },

  prettierSkipFormatting,
);
