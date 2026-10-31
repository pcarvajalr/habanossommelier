// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// Dominio canónico. En Vercel se toma el dominio de producción del proyecto
// (el personalizado si está conectado); fuera de Vercel, SITE_URL o el dominio propio.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : 'https://habanossommelier.com');

// Sitio estático: Vercel detecta Astro y publica `dist/` sin adaptador.
export default defineConfig({
  site,
  // URLs sin barra final (/sobre-mi); Vercel sirve los .html con cleanUrls
  trailingSlash: 'never',
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { inlineStylesheets: 'auto', format: 'file' },
  // Fuentes servidas desde el propio dominio (sin depender de Google Fonts en el
  // navegador ni al compilar), con fuentes de respaldo ajustadas para evitar
  // saltos de diseño (CLS). El subconjunto latino cubre todo el español.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-serif',
      fallbacks: ['Times New Roman', 'serif'],
      options: {
        variants: [
          { src: ['@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2'], weight: '300 700', style: 'normal' },
          { src: ['@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2'], weight: '300 700', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Manrope',
      cssVariable: '--font-sans',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          { src: ['@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'], weight: '200 800', style: 'normal' },
        ],
      },
    },
  ],
  // three.js se carga aparte y en diferido; su tamaño es esperado
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
