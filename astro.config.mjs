// @ts-check
import { defineConfig } from 'astro/config';

// Sitio estático: Vercel detecta Astro y publica `dist/` sin adaptador.
export default defineConfig({
  site: 'https://habanossommelier.vercel.app',
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { inlineStylesheets: 'auto' },
  // three.js se carga aparte y en diferido; su tamaño es esperado
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
