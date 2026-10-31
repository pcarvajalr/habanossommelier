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

/**
 * Capa del habano (tono colorado). El ancho de la textura recorre la
 * circunferencia y el alto el largo del habano.
 */
export function wrapperTextures(size: number) {
  const w = size;
  const h = size / 2;
  const rand = rng(7);
  const [c, g] = canvas(w, h);
  const [bc, b] = canvas(w, h);

  const base = g.createLinearGradient(0, 0, w, 0);
  base.addColorStop(0, '#4e301b');
  base.addColorStop(0.5, '#5c3820');
  base.addColorStop(1, '#4e301b');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, w, h);

  // Manchas de color de la hoja
  for (let i = 0; i < 260; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 10 + rand() * 60;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.5;
    grd.addColorStop(0, dark ? 'rgba(40,22,12,0.18)' : 'rgba(150,96,58,0.14)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Venas de la hoja en diagonal (la capa se enrolla en espiral)
  const veins = (ctx: CanvasRenderingContext2D, light: string, dark: string) => {
    for (let i = 0; i < 70; i++) {
      const x0 = rand() * w * 1.4 - w * 0.2;
      const len = 80 + rand() * 260;
      const ang = -0.55 + (rand() - 0.5) * 0.25;
      ctx.strokeStyle = rand() > 0.35 ? dark : light;
      ctx.lineWidth = 0.6 + rand() * 1.6;
      ctx.beginPath();
      const y0 = rand() * h;
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(
        x0 + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 20,
        y0 + Math.sin(ang) * len * 0.5,
        x0 + Math.cos(ang) * len,
        y0 + Math.sin(ang) * len,
      );
      ctx.stroke();
    }
  };
  veins(g, 'rgba(170,118,72,0.35)', 'rgba(35,18,8,0.35)');
  veins(b, 'rgba(255,255,255,0.6)', 'rgba(200,200,200,0.5)');

  // Costura en espiral de la capa
  for (let k = -2; k < 6; k++) {
    g.strokeStyle = 'rgba(30,16,8,0.5)';
    b.strokeStyle = 'rgba(30,30,30,0.9)';
    for (const ctx of [g, b]) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(k * (w / 3), 0);
      ctx.lineTo(k * (w / 3) + w * 0.9, h);
      ctx.stroke();
    }
  }

  // Grano fino
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n * 0.8;
    img.data[i + 2] += n * 0.6;
  }
  g.putImageData(img, 0, 0);

  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  const bump = new CanvasTexture(bc);
  for (const t of [map, bump]) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 4;
  }
  return { map, bump };
}

/** Anillo del habano: rojo profundo con filetes dorados y la marca. */
export function bandTexture() {
  const w = 2048;
  const h = 256;
  const [c, g] = canvas(w, h);

  const red = g.createLinearGradient(0, 0, 0, h);
  red.addColorStop(0, '#5c0f12');
  red.addColorStop(0.5, '#8e1a1d');
  red.addColorStop(1, '#5c0f12');
  g.fillStyle = red;
  g.fillRect(0, 0, w, h);

  const gold = g.createLinearGradient(0, 0, 0, h);
  gold.addColorStop(0, '#f3dba0');
  gold.addColorStop(0.5, '#b88a3e');
  gold.addColorStop(1, '#f0d391');
  g.fillStyle = gold;
  g.fillRect(0, 0, w, 26);
  g.fillRect(0, h - 26, w, 26);
  g.fillRect(0, 36, w, 4);
  g.fillRect(0, h - 40, w, 4);

  // Patrón de rombos dorados
  g.strokeStyle = 'rgba(232,200,130,0.35)';
  g.lineWidth = 2;
  for (let x = -h; x < w + h; x += 48) {
    g.beginPath();
    g.moveTo(x, 44);
    g.lineTo(x + 84, h - 44);
    g.moveTo(x + 84, 44);
    g.lineTo(x, h - 44);
    g.stroke();
  }

  // Dos medallones y texto, repartidos en la circunferencia
  for (let k = 0; k < 2; k++) {
    const cx = w * (0.25 + k * 0.5);
    g.fillStyle = '#6f1316';
    g.fillRect(cx - 360, 44, 720, h - 88);
    g.beginPath();
    g.ellipse(cx, h / 2, 120, 86, 0, 0, Math.PI * 2);
    g.fillStyle = gold;
    g.fill();
    g.beginPath();
    g.ellipse(cx, h / 2, 106, 74, 0, 0, Math.PI * 2);
    g.fillStyle = '#7a1518';
    g.fill();
    g.fillStyle = gold;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '500 92px "Cormorant Garamond", serif';
    g.fillText('HS', cx, h / 2 + 4);
    g.font = '600 34px "Manrope", sans-serif';
    g.fillText('H A B A N O S', cx - 250, h / 2 + 2);
    g.fillText('S O M M E L I E R', cx + 260, h / 2 + 2);
  }

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Ceniza en capas, gris claro con anillos irregulares. */
export function ashTexture() {
  const w = 512;
  const h = 256;
  const rand = rng(3);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#8f8a84';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const y = rand() * h;
    g.fillStyle = rand() > 0.5 ? 'rgba(60,56,52,0.35)' : 'rgba(210,205,198,0.35)';
    g.fillRect(0, y, w, 1 + rand() * 4);
  }
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(${rand() > 0.5 ? '30,28,26' : '230,226,220'},${0.2 + rand() * 0.3})`;
    g.fillRect(rand() * w, rand() * h, 2, 2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
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
