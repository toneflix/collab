import { createIconsConfig, createVuestic } from 'vuestic-ui'

import { defineBoot } from '#q-app';
import config from 'app/vuestic.config.js'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default defineBoot(async ({ app }) => {
  app.use(createVuestic({
    config: {
      colors: {
        ...config.colors,
        variables: {
          ...config.colors.variables,
          // Default colors
          primary: '#1976D2',
          secondary: '#26A69A',
          success: '#21BA45',
          info: '#31CCEC',
          danger: '#C10015',
          warning: '#F2C037',
          gray: '#babfc2',
          dark: '#1D1D1D',

          // Custom colors
          yourCustomColor: '#d0f55d',
        },
      },
      icons: createIconsConfig({
        fonts: [
          {
            name: 'fa4-{iconName}',
            resolve: ({ iconName }) => ({ class: `fas fa-${iconName}` }),
          },
        ]
      }),
    },
  }))
})
