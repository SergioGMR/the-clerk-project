// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite'
import vercel from '@astrojs/vercel';
import { dark } from '@clerk/themes'
import clerk from '@clerk/astro';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
        '@types': '/src/types',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@data': '/src/data'
      }
    }
  },

  integrations: [clerk(
    {
      appearance: {
        baseTheme: dark,
      },
    }
  )],
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
    imageService: true,
  }),
  output: 'server',
});