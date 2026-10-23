// https://github.com/michael-ciniawsky/postcss-load-config

import autoprefixer from 'autoprefixer';
import tailwindcss from '@tailwindcss/postcss';

export default {
  plugins: [
    tailwindcss(),

    // https://github.com/postcss/autoprefixer
    autoprefixer({
      overrideBrowserslist: ['baseline widely available'],
    }),
  ],
};
