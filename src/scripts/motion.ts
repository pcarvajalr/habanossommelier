import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { CigarScene, CigarState } from './cigar/scene';
import type { FieldScene } from './field/scene';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------- Scroll suave (Lenis) sincronizado con GSAP ----------
// En pantallas táctiles Lenis deja el scroll nativo: es lo más fluido en móvil.
const lenis = reduced ? null : new Lenis({ lerp: 0.1 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('menu:open', () => lenis.stop());
  document.addEventListener('menu:close', () => lenis.start());
}

// ---------- Habano 3D ----------
type Preset = Partial<CigarState> & { opacity?: number };
type Pose = { d: Preset; m: Preset };

const H = Math.PI / 2;
/** Poses del habano por sección. rz = 0 es vertical con la perilla arriba. */
const POSES: Record<string, Pose> = {
  hero: {
    d: { x: 0.4, y: -0.04, scale: 0.86, rx: 0.35, ry: 0, rz: 2.1, glow: 1, smoke: 1, opacity: 1 },
    m: { x: 0, y: 0.5, scale: 0.9, rx: 0.4, ry: 0, rz: 2.2, glow: 1, smoke: 1, opacity: 1 },
  },
  about: {
    // Con la foto de Alejandro el habano se retira y deja su humo
    d: { x: -0.2, y: 1.2, scale: 0.6, rx: 0.9, ry: 0.3, rz: 3 * H - 0.25, glow: 0.8, smoke: 0.5, opacity: 0 },
    m: { x: 0.45, y: 1.2, scale: 0.55, rx: 0.6, ry: 0, rz: 3 * H - 0.4, glow: 0.8, smoke: 0.5, opacity: 0 },
  },
  services: {
    d: { x: 0.74, y: 0.05, scale: 0.72, rx: 0.2, ry: 0, rz: Math.PI + 0.3, glow: 0.9, smoke: 0.9, opacity: 0.9 },
    m: { x: 0.6, y: 0.4, scale: 0.5, rx: 0.2, ry: 0, rz: Math.PI + 0.3, glow: 0.8, smoke: 0.6, opacity: 0.25 },
  },
  leaf: {
    d: { x: 0, y: -1.3, scale: 0.7, rx: 0.45, ry: 0, rz: 3 * H, glow: 1.2, smoke: 1, opacity: 0 },
    m: { x: 0, y: -1.3, scale: 0.7, rx: 0.45, ry: 0, rz: 3 * H, glow: 1.2, smoke: 1, opacity: 0 },
  },
  ritual: {
    d: { x: 0, y: -1.3, scale: 0.8, rx: 0.45, ry: 0, rz: 3 * H, glow: 1.7, smoke: 1, opacity: 0 },
    m: { x: 0, y: -1.3, scale: 0.85, rx: 0.5, ry: 0, rz: 3 * H, glow: 1.6, smoke: 1, opacity: 0 },
  },
  contact: {
    d: { x: 0.58, y: 0.05, scale: 0.88, rx: 0.4, ry: 0, rz: 2 * Math.PI + 0.8, glow: 1.2, smoke: 1, opacity: 1 },
    m: { x: 0.2, y: 0.74, scale: 0.7, rx: 0.4, ry: 0, rz: 2 * Math.PI + 0.8, glow: 1.2, smoke: 0.8, opacity: 0.4 },
  },
  bio: {
    d: { x: 0.9, y: 1.2, scale: 0.7, rx: 0.5, ry: 0, rz: Math.PI + 0.45, glow: 1, smoke: 0.5, opacity: 0 },
    m: { x: 0.25, y: 1.2, scale: 0.65, rx: 0.5, ry: 0, rz: 2.4, glow: 1, smoke: 0.5, opacity: 0 },
  },
  gallery: {
    d: { x: 0.9, y: 1.2, scale: 0.7, rx: 0.5, ry: 0, rz: Math.PI + 0.45, glow: 1, smoke: 0.5, opacity: 0 },
    m: { x: 0.25, y: 1.2, scale: 0.65, rx: 0.5, ry: 0, rz: 2.4, glow: 1, smoke: 0.5, opacity: 0 },
  },
};

let scene: CigarScene | null = null;
let scenePromise: Promise<CigarScene | null> | null = null;
/** Pose objetivo que anima el scroll; el habano la sigue con amortiguación. */
const target: Required<Preset> = { ...(POSES.hero.d as Required<Preset>) };

function loadScene() {
  if (scenePromise) return scenePromise;
  const canvas = document.querySelector<HTMLCanvasElement>('[data-cigar]');
  if (!canvas) return Promise.resolve(null);
  scenePromise = (async () => {
    try {
      const { createCigarScene } = await import('./cigar/scene');
      const s = await createCigarScene(canvas, { mobile: isMobile(), reducedMotion: reduced });
      Object.assign(s.state, target);
      scene = s;
      canvas.classList.add('is-ready');
      return s;
    } catch (err) {
      // Sin WebGL el sitio sigue funcionando con el fondo cálido de CSS.
      console.warn('Habano 3D no disponible', err);
      return null;
    }
  })();
  return scenePromise;
}

let hiddenSince = 0;
// ---------- Vega de tabaco de fondo ----------
let field: FieldScene | null = null;
let fieldPromise: Promise<FieldScene | null> | null = null;
const TRAVEL_PER_PX = 0.0045;
let lastScrollY = window.scrollY;

function loadField() {
  if (fieldPromise) return fieldPromise;
  const canvas = document.querySelector<HTMLCanvasElement>('[data-field]');
  if (!canvas) return Promise.resolve(null);
  fieldPromise = (async () => {
    try {
      const { createFieldScene } = await import('./field/scene');
      const f = await createFieldScene(canvas, { mobile: isMobile(), reducedMotion: reduced });
      f.travel = window.scrollY * TRAVEL_PER_PX;
      field = f;
      canvas.classList.add('is-ready');
      return f;
    } catch (err) {
      console.warn('Vega 3D no disponible', err);
      return null;
    }
  })();
  return fieldPromise;
}

/** Bajar avanza por la vega y subir retrocede; al cambiar de página se sigue desde donde iba. */
function syncTravel() {
  const y = window.scrollY;
  if (field) field.travel += (y - lastScrollY) * TRAVEL_PER_PX;
  lastScrollY = y;
}
window.addEventListener('scroll', syncTravel, { passive: true });

const KEYS = ['x', 'y', 'scale', 'rx', 'ry', 'rz', 'glow', 'smoke'] as const;
gsap.ticker.add((_, dt) => {
  if (!scene) return;
  const k = reduced ? 1 : 1 - Math.exp((-dt / 1000) * 3.5);
  for (const key of KEYS) scene.state[key] += (target[key] - scene.state[key]) * k;
  const canvas = document.querySelector<HTMLElement>('[data-cigar]');
  if (canvas) canvas.style.setProperty('--cigar-opacity', target.opacity.toFixed(3));
  // Deja de pintar cuando el habano lleva un rato oculto (la opacidad tarda 0,5 s en llegar a 0)
  if (target.opacity > 0.01) hiddenSince = 0;
  else if (!hiddenSince) hiddenSince = performance.now();
  scene.paused = hiddenSince > 0 && performance.now() - hiddenSince > 700;
});

function poseFor(name: string | undefined): Required<Preset> | null {
  const pose = name ? POSES[name] : undefined;
  return pose ? ({ ...POSES.hero.d, ...(isMobile() ? pose.m : pose.d) } as Required<Preset>) : null;
}

/** Línea de tiempo del habano a lo largo de toda la página. */
function buildSceneTimeline() {
  const sections = gsap.utils.toArray<HTMLElement>('[data-scene]');
  if (!sections.length) return;
  const first = poseFor(sections[0].dataset.scene);
  if (!first) return;
  Object.assign(target, first);

  const vh = window.innerHeight;
  const max = Math.max(1, document.documentElement.scrollHeight - vh);
  const tl = gsap.timeline({
    defaults: { ease: 'power1.inOut' },
    scrollTrigger: { start: 0, end: max, scrub: true },
  });
  for (const sec of sections.slice(1)) {
    const pose = poseFor(sec.dataset.scene);
    if (!pose) continue;
    const top = sec.getBoundingClientRect().top + window.scrollY;
    const start = gsap.utils.clamp(0, 1, (top - vh) / max);
    const end = gsap.utils.clamp(start + 0.001, 1, (top - vh * 0.25) / max);
    tl.to(target, { ...pose, duration: end - start }, start);
  }
  tl.set({}, {}, 1);
}

// ---------- Efectos de texto y entrada ----------
function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return el.querySelectorAll<HTMLElement>('.w > span');
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of (child.textContent ?? '').split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) frag.append(' ');
          else {
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            w.append(inner);
            frag.append(w);
          }
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName !== 'BR') walk(child);
    }
  };
  walk(el);
  el.dataset.splitDone = '1';
  return el.querySelectorAll<HTMLElement>('.w > span');
}

function initReveals() {
  // Títulos: cada palabra sube desde una máscara
  gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
    const words = splitWords(el);
    const intro = el.hasAttribute('data-intro');
    gsap.fromTo(
      words,
      { yPercent: 115, rotate: 4 },
      {
        yPercent: 0,
        rotate: 0,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.06,
        delay: intro ? 0.25 : 0,
        scrollTrigger: intro ? undefined : { trigger: el, start: 'top 85%' },
      },
    );
  });

  // Párrafo que se ilumina palabra por palabra al hacer scroll
  gsap.utils.toArray<HTMLElement>('[data-scrub-words]').forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(
      words,
      { opacity: 0.16 },
      { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } },
    );
  });

  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: el.hasAttribute('data-intro') ? undefined : { trigger: el, start: 'top 88%' },
      },
    );
  });

  // Contadores
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const prefix = el.dataset.prefix ?? '';
    const suffix = el.dataset.suffix ?? '';
    const o = { v: 0 };
    gsap.to(o, {
      v: end,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => (el.textContent = `${prefix}${Math.round(o.v)}${suffix}`),
    });
  });

  // Líneas doradas que se dibujan
  gsap.utils.toArray<HTMLElement>('[data-line]').forEach((el) => {
    gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // Fotos que se descubren con una cortina
  gsap.utils.toArray<HTMLElement>('[data-clip]').forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(18% 8% 18% 8% round 14px)', opacity: 0.4 },
      { clipPath: 'inset(0% 0% 0% 0% round 14px)', opacity: 1, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } },
    );
  });

  // Imágenes/paneles con parallax suave
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const amt = Number(el.dataset.parallax || 15);
    gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el, scrub: true } });
  });

  // Columnas de la galería a distinto ritmo
  gsap.utils.toArray<HTMLElement>('[data-col-speed]').forEach((col) => {
    const amt = Number(col.dataset.colSpeed) * (isMobile() ? 0.5 : 1);
    gsap.fromTo(col, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: col.parentElement, scrub: true } });
  });

  // Barra de progreso tipo brasa
  const bar = document.querySelector('[data-progress]');
  if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
}

/** El ritual: scroll horizontal fijado en escritorio, lista vertical en móvil. */
function initHorizontal(mm: gsap.MatchMedia) {
  mm.add('(min-width: 861px)', () => {
    gsap.utils.toArray<HTMLElement>('[data-hscroll]').forEach((wrap) => {
      const track = wrap.querySelector<HTMLElement>('[data-hscroll-track]');
      if (!track) return;
      const dist = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
      });
      track.querySelectorAll<HTMLElement>('[data-step]').forEach((step) => {
        gsap.fromTo(
          step.querySelector('.step__num'),
          { yPercent: 40, opacity: 0.2 },
          { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 90%', end: 'left 40%', scrub: true } },
        );
      });
    });
  });
}

/** Tarjetas con inclinación 3D y botones magnéticos (solo con ratón). */
function initPointerFx() {
  if (!finePointer || reduced) return () => {};
  const cleanups: (() => void)[] = [];
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rx(-py * 10);
      ry(px * 12);
      card.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
      card.style.setProperty('--my', `${(py + 0.5) * 100}%`);
    };
    const leave = () => (rx(0), ry(0));
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    cleanups.push(() => (card.removeEventListener('pointermove', move), card.removeEventListener('pointerleave', leave)));
  });
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.3);
      y((e.clientY - r.top - r.height / 2) * 0.4);
    };
    const leave = () => (x(0), y(0));
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    cleanups.push(() => (el.removeEventListener('pointermove', move), el.removeEventListener('pointerleave', leave)));
  });
  return () => cleanups.forEach((c) => c());
}

// ---------- Ciclo de vida con View Transitions ----------
let ctx: gsap.Context | null = null;
let mm: gsap.MatchMedia | null = null;
let pointerCleanup = () => {};
let resizeTimer = 0;
let lastWidth = window.innerWidth;

function setup() {
  ctx = gsap.context(() => {
    initReveals();
  });
  mm = gsap.matchMedia();
  initHorizontal(mm);
  // El habano se reconstruye al cruzar el punto de corte móvil/escritorio
  mm.add({ mobile: '(max-width: 860px)', desktop: '(min-width: 861px)' }, () => {
    buildSceneTimeline();
  });
  pointerCleanup = initPointerFx();
  ScrollTrigger.refresh();
  lenis?.resize();
}

function teardown() {
  pointerCleanup();
  mm?.revert();
  ctx?.revert();
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

document.addEventListener('astro:page-load', () => {
  setup();
  // El 3D se carga después de pintar el contenido para no frenar la primera carga
  const start = () => {
    loadField();
    loadScene();
  };
  if (scenePromise) start();
  else if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 400);
});
document.addEventListener('astro:before-swap', () => {
  teardown();
  lastScrollY = 0;
});
document.addEventListener('astro:after-swap', () => {
  lenis?.scrollTo(0, { immediate: true });
});

// ---------- Enlaces a secciones (#contacto, #servicios…) ----------
// En la misma página se desplaza con Lenis; si vienen de otra página, se espera a que
// ScrollTrigger cree los espacios de las secciones fijadas antes de saltar.
function scrollToHash(hash: string, immediate = false) {
  const el = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  if (!el) return false;
  if (lenis) {
    lenis.start(); // el menú móvil detiene Lenis mientras está abierto
    lenis.scrollTo(el, { offset: -20, immediate, duration: 1.6, force: true });
  }
  else el.scrollIntoView({ behavior: immediate || reduced ? 'auto' : 'smooth' });
  return true;
}

window.addEventListener(
  'click',
  (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    if (scrollToHash(url.hash)) {
      e.preventDefault(); // el ClientRouter de Astro respeta esto y no navega
      history.replaceState(history.state, '', url.hash);
    }
  },
  true,
);

document.addEventListener('astro:page-load', () => {
  if (location.hash) requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash(location.hash, true)));
});

// La velocidad del scroll hace girar el habano sobre su eje
lenis?.on('scroll', ({ velocity }: { velocity: number }) => scene?.kick(velocity * 0.02));

window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return; // ignora la barra de URL del móvil
  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    teardown();
    setup();
  }, 250);
});
