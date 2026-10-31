# Habanos Sommelier

Web de Alejandro, sommelier y representante y distribuidor exclusivo de habanos en Colombia ([@habanossommelier](https://www.instagram.com/habanossommelier/)).

## Stack

- [Astro](https://astro.build) 7, sitio estático.
- View Transitions de Astro (`<ClientRouter />`) para navegar entre páginas sin recargar; el habano 3D persiste entre páginas.
- [GSAP](https://gsap.com) + ScrollTrigger para las animaciones ligadas al scroll.
- [Lenis](https://lenis.darkroom.engineering) para el scroll suave en escritorio (en táctil se usa el scroll nativo).
- [Three.js](https://threejs.org) para el habano 3D (capa y ceniza texturizadas con fotos reales) y para el fondo: un recorrido por una vega de tabaco bajo el tapado que avanza con el scroll.

## Desarrollo

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run preview
```

Requiere Node 22.23 o superior.

## Estructura

| Ruta | Qué contiene |
| --- | --- |
| `src/data/site.ts` | Todos los textos: presentación, servicios, ritual, cifras, Instagram y WhatsApp. Edita aquí el contenido. |
| `src/pages/` | `index` (inicio), `sobre-mi` y `404`. |
| `src/components/` | Secciones de la página. |
| `src/scripts/motion.ts` | Scroll suave, animaciones y la coreografía del habano por sección (`POSES`). |
| `src/scripts/cigar/` | Escena 3D y texturas del habano (capa, anillo, ceniza, brasa, humo). |
| `src/scripts/field/` | Vega de tabaco de fondo (plantas instanciadas, viento, tierra roja y tapado). |
| `public/textures/` | Capa y ceniza del habano, sacadas de fotos reales. |
| `src/assets/fotos/` | Fotos originales. Astro genera versiones AVIF/WebP en varios tamaños al compilar. |
| `public/media/` | Video "La hoja" (comprimido, sin audio) y su imagen de portada. |
| `public/og.jpg` | Imagen para compartir en redes (1200×630). |

Cada sección lleva `data-scene="nombre"`; el habano se mueve a la pose con ese nombre en `POSES` (una para escritorio y otra para móvil).

## Rendimiento en móvil

- El JS inicial pesa unos 58 KB comprimido. Three.js (unos 137 KB) se carga después de pintar la página, en un momento de inactividad.
- En móvil la escena usa menos geometría, texturas más pequeñas, menos humo y una densidad de píxeles limitada a 1,5.
- Con "reducir movimiento" activado en el sistema se desactivan el scroll suave, el humo y las animaciones.
- Si el dispositivo no tiene WebGL, la web funciona igual con el fondo cálido en CSS.
- Las fotos se sirven en AVIF/WebP al tamaño de cada pantalla y se cargan al acercarse.
- El video solo se descarga cuando está a punto de verse, y nunca con el ahorro de datos activado.
- Cuando el habano está oculto (secciones con fotos), la escena 3D deja de pintar.
- La vega de fondo usa una sola llamada de dibujo para todas las hojas, niebla para ocultar lo lejano y menos plantas y resolución en móvil.

## Despliegue en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa el repositorio `pcarvajalr/habanossommelier`.
2. Vercel detecta Astro solo: no hay que cambiar nada (build `npm run build`, salida `dist`).
3. Cuando tengas dominio, añádelo en *Settings → Domains* y actualiza `site` en `astro.config.mjs`.

## Pendiente

- Confirmar la lista de servicios.
- Confirmar el permiso de las personas que aparecen junto a Alejandro en algunas fotos (evento en terraza y humidor).

## SEO

- Dominio canónico: `https://www.habanossommelier.com`, configurable con `SITE_URL`. En Vercel, el dominio sin www redirige (308) a www.
- `src/layouts/Base.astro`: título, descripción, canonical, Open Graph, Twitter y datos estructurados JSON-LD (`src/lib/schema.ts`: WebSite, ProfessionalService/LocalBusiness con servicios, Person y migas de pan).
- `/sitemap.xml`, `/robots.txt` y `/site.webmanifest` se generan en `src/pages/`. Al añadir una página indexable, súmala a `src/pages/sitemap.xml.ts`.
- Fuentes servidas desde el propio dominio con `fonts` de Astro (paquetes `@fontsource-variable`), con precarga y respaldo ajustado para evitar saltos de diseño.
- En Google Search Console, envía `https://www.habanossommelier.com/sitemap.xml`.
