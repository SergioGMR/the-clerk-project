// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite';

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

  integrations: [clerk()],
  adapter: node({ mode: 'standalone' }),
  output: 'server',
});