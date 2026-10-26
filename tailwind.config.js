/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/components/**/*.{js,vue,ts}',
    './src/layouts/**/*.vue',
    './src/pages/**/*.vue',
    './src/plugins/**/*.{js,ts}',
    './src/App.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--tf-primary)',
        'primary-hover': 'var(--tf-primary-hover)',
        'primary-soft': 'var(--tf-primary-soft)',
        'on-primary': 'var(--tf-on-primary)',
        secondary: 'var(--tf-secondary)',
        accent: 'var(--tf-accent)',
        success: 'var(--tf-success)',
        info: 'var(--tf-info)',
        danger: 'var(--tf-danger)',
        warning: 'var(--tf-warning)',
        page: 'var(--tf-bg)',
        surface: {
          1: 'var(--tf-surface-1)',
          2: 'var(--tf-surface-2)',
          3: 'var(--tf-surface-3)',
        },
        line: {
          DEFAULT: 'var(--tf-border)',
          strong: 'var(--tf-border-strong)',
        },
        fg: {
          DEFAULT: 'var(--tf-text)',
          muted: 'var(--tf-text-muted)',
          subtle: 'var(--tf-text-subtle)',
        },
        // Cool neutrals that match the surfaces, so existing gray-* classes follow the theme
        gray: {
          50: '#f4f5f7',
          100: '#e7e9ed',
          200: '#cdd1d8',
          300: '#a9afba',
          400: '#8a919e',
          500: '#6c7383',
          600: '#4f5564',
          700: '#363b47',
          800: '#23272f',
          900: '#15181d',
          950: '#0b0d10',
        },
        // Older names kept for existing markup
        backgroundPrimary: 'var(--tf-bg)',
        backgroundSecondary: 'var(--tf-surface-1)',
        backgroundElement: 'var(--tf-surface-2)',
        backgroundBorder: 'var(--tf-border)',
        textPrimary: 'var(--tf-text)',
        textInverted: 'var(--tf-on-primary)',
        shadow: 'rgb(0 0 0 / 35%)',
        focus: 'var(--tf-focus)',
        transparent: 'rgba(0, 0, 0, 0)',
      },
      fontFamily: {
        sans: 'var(--tf-font-sans)',
        display: 'var(--tf-font-display)',
        mono: 'var(--tf-font-mono)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--tf-ease)',
      },
      transitionDuration: {
        DEFAULT: 'var(--tf-duration)',
      },
      screens: {
        xs: '0px',
        sm: '640px',
        md: '1024px',
        lg: '1440px',
        xl: '1920px',
      },
    },
  },
  plugins: [],
};
