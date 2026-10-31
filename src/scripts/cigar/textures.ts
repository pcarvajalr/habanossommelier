import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/** Generador pseudoaleatorio con semilla, para que la textura sea siempre igual. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

type Paint = { paper: string | CanvasGradient; gold: string | CanvasGradient; red: string; ink: string };

/** Dibuja el anillo. Se pinta tres veces con paletas distintas: color, metal/rugosidad y relieve. */
function paintBand(g: CanvasRenderingContext2D, w: number, h: number, c: Paint) {
  g.fillStyle = c.paper;
  g.fillRect(0, 0, w, h);
  // Filetes dorados
  g.fillStyle = c.gold;
  g.fillRect(0, 0, w, 18);
  g.fillRect(0, h - 18, w, 18);
  g.fillRect(0, 26, w, 3);
  g.fillRect(0, h - 29, w, 3);
  // Banda roja central con grecas doradas
  g.fillStyle = c.red;
  g.fillRect(0, h / 2 - 34, w, 68);
  g.fillStyle = c.gold;
  g.fillRect(0, h / 2 - 34, w, 3);
  g.fillRect(0, h / 2 + 31, w, 3);
  for (let x = 0; x < w; x += 22) {
    g.beginPath();
    g.arc(x + 11, 40, 4, 0, Math.PI * 2);
    g.arc(x + 11, h - 40, 4, 0, Math.PI * 2);
    g.fill();
  }
  // Medallón y texto, dos veces en la vuelta
  for (let k = 0; k < 2; k++) {
    const cx = w * (0.25 + k * 0.5);
    g.fillStyle = c.paper;
    g.fillRect(cx - 330, h / 2 - 34, 660, 68);
    g.fillStyle = c.gold;
    g.beginPath();
    g.ellipse(cx, h / 2, 104, 92, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = c.red;
    g.beginPath();
    g.ellipse(cx, h / 2, 90, 78, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = c.gold;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '600 80px "Cormorant Garamond", serif';
    g.fillText('HS', cx, h / 2 + 4);
    g.fillStyle = c.ink;
    g.font = '600 30px "Cormorant Garamond", serif';
    g.fillText('HABANOS', cx - 215, h / 2 + 2);
    g.fillText('SOMMELIER', cx + 225, h / 2 + 2);
  }
}

/** Anillo de papel con estampado dorado: color, mapa de metal/rugosidad y relieve. */
export function bandTextures() {
  const w = 2048;
  const h = 256;
  const make = (paint: (g: CanvasRenderingContext2D) => Paint) => {
    const [c, g] = canvas(w, h);
    paintBand(g, w, h, paint(g));
    const t = new CanvasTexture(c);
    t.anisotropy = 8;
    // La cara exterior del cilindro ve la textura en espejo; se invierte para leer bien
    t.wrapS = RepeatWrapping;
    t.repeat.x = -1;
    return t;
  };
  const map = make((g) => {
    const gold = g.createLinearGradient(0, 0, 0, h);
    gold.addColorStop(0, '#e2c27a');
    gold.addColorStop(0.3, '#a8792c');
    gold.addColorStop(0.55, '#e8c983');
    gold.addColorStop(1, '#94661f');
    return { paper: '#e9dfc8', gold, red: '#7a1315', ink: '#3a1a0e' };
  });
  map.colorSpace = SRGBColorSpace;
  // Azul = metal, verde = rugosidad (convención de three.js)
  const metal = make(() => ({ paper: 'rgb(0,215,0)', gold: 'rgb(0,70,255)', red: 'rgb(0,170,0)', ink: 'rgb(0,190,0)' }));
  const bump = make(() => ({ paper: '#777', gold: '#d8d8d8', red: '#888', ink: '#9a9a9a' }));
  return { map, metal, bump };
}

/** Capa quemada junto a la brasa: negro irregular que se desvanece hacia la capa sana. */
export function charTexture() {
  const w = 1024;
  const h = 128;
  const rand = rng(21);
  const [c, g] = canvas(w, h);
  g.clearRect(0, 0, w, h);
  // v = 0 está abajo (el pie); el borde quemado sube de forma irregular
  const edge: number[] = [];
  for (let x = 0; x <= w; x += 8) edge.push(18 + rand() * 26 + Math.sin(x * 0.02) * 8);
  g.beginPath();
  g.moveTo(0, h);
  edge.forEach((e, i) => g.lineTo(i * 8, h - e));
  g.lineTo(w, h);
  g.closePath();
  g.fillStyle = 'rgba(14,10,8,0.97)';
  g.fill();
  // Halo tostado por encima del borde
  const grd = g.createLinearGradient(0, h, 0, 0);
  grd.addColorStop(0, 'rgba(40,22,12,0.85)');
  grd.addColorStop(0.45, 'rgba(70,38,18,0.45)');
  grd.addColorStop(1, 'rgba(70,38,18,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // Motas de ceniza pegadas al borde
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${rand() > 0.6 ? '190,184,176' : '20,14,10'},${0.4 + rand() * 0.5})`;
    g.beginPath();
    g.arc(rand() * w, h - rand() * 30, 1 + rand() * 2.5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Brasa del pie: núcleo naranja que se apaga hacia el borde. */
export function emberTexture() {
  const s = 256;
  const [c, g] = canvas(s, s);
  const rand = rng(11);
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, '#ffcf7a');
  grd.addColorStop(0.35, '#ff7a2a');
  grd.addColorStop(0.75, '#b8300f');
  grd.addColorStop(1, '#3a120a');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(40,16,8,${rand() * 0.5})`;
    g.beginPath();
    g.arc(rand() * s, rand() * s, rand() * 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
