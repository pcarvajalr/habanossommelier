import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Timer,
  WebGLRenderer,
} from 'three';

/**
 * Fondo: un recorrido por una vega de tabaco cubana bajo el tapado.
 * La cámara avanza entre los surcos con el scroll; las hojas se mecen con el viento.
 */
export interface FieldScene {
  /** Distancia recorrida (unidades de escena). Se suaviza dentro del bucle. */
  travel: number;
  paused: boolean;
  destroy(): void;
}

const BG = new Color(0x22130a); // bruma cálida de atardecer
const ROW_GAP = 1.1; // separación entre surcos
const PLANT_GAP = 0.62; // separación entre plantas del mismo surco
const CHUNK = 36; // largo de cada tramo de vega; dos tramos se van turnando

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Hoja de tabaco: ovalada, con nervio central y nervaduras, recortada con alfa. */
function leafTexture() {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  // Contorno: la hoja nace a la izquierda (u = 0) y termina en punta a la derecha
  g.beginPath();
  g.moveTo(4, h / 2);
  g.bezierCurveTo(w * 0.25, -h * 0.05, w * 0.75, h * 0.02, w - 2, h / 2);
  g.bezierCurveTo(w * 0.75, h * 0.98, w * 0.25, h * 1.05, 4, h / 2);
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#7f9d4c');
  grd.addColorStop(0.5, '#9cb95c');
  grd.addColorStop(1, '#86a24f');
  g.fillStyle = grd;
  g.fill();
  g.save();
  g.clip();
  // Sombreado hacia los bordes
  const edge = g.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, 'rgba(40,60,20,0.45)');
  edge.addColorStop(0.5, 'rgba(255,255,220,0.08)');
  edge.addColorStop(1, 'rgba(40,60,20,0.45)');
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);
  // Nervaduras
  g.strokeStyle = 'rgba(225,235,190,0.55)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(220,232,180,0.35)';
  for (let x = 18; x < w - 20; x += 16) {
    for (const dir of [-1, 1]) {
      g.beginPath();
      g.moveTo(x, h / 2);
      g.quadraticCurveTo(x + 14, h / 2 + dir * 22, x + 30, h / 2 + dir * 52);
      g.stroke();
    }
  }
  g.restore();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Tierra roja de Vuelta Abajo con surcos a lo largo del recorrido. */
function soilTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d')!;
  const rand = rng(9);
  g.fillStyle = '#6a2f1a';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = rand() > 0.5 ? 'rgba(40,16,8,0.35)' : 'rgba(150,72,40,0.3)';
    g.fillRect(rand() * s, rand() * s, 1 + rand() * 3, 1 + rand() * 3);
  }
  // Surco (más oscuro) en el centro de cada tesela, a lo largo de v
  const grd = g.createLinearGradient(0, 0, s, 0);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.45, 'rgba(25,10,5,0.55)');
  grd.addColorStop(0.55, 'rgba(25,10,5,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Malla blanca del tapado, vista desde abajo. */
function clothTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(235,228,210,0.55)';
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,250,235,0.9)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, s, s);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Hoja curvada: nace en x = 0, cae por su peso y se ahueca a lo ancho. */
function leafGeometry() {
  const geo = new PlaneGeometry(1, 0.46, 8, 3);
  geo.translate(0.5, 0, 0);
  geo.rotateX(-Math.PI / 2); // tumbada en el plano XZ
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setY(i, 0.22 * x - 0.42 * x * x + 0.35 * z * z);
  }
  geo.computeVertexNormals();
  return geo;
}

export async function createFieldScene(canvas: HTMLCanvasElement, opts: { mobile: boolean; reducedMotion: boolean }): Promise<FieldScene> {
  const { mobile, reducedMotion } = opts;
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  // Es un fondo envuelto en niebla: no necesita alta densidad de píxeles
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.25));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(BG, 1);

  const scene = new Scene();
  scene.fog = new FogExp2(BG, mobile ? 0.09 : 0.07);
  const camera = new PerspectiveCamera(mobile ? 62 : 52, 1, 0.05, 40);

  // Atardecer dorado que entra por delante, con rebote cálido de la tierra roja
  scene.add(new HemisphereLight(0xffe2b0, 0x5a2414, 0.9));
  const sun = new DirectionalLight(0xffc27a, 2.2);
  sun.position.set(-3, 4, -6);
  scene.add(sun);

  // ---- Plantas ----
  const rand = rng(17);
  const leafGeo = leafGeometry();
  const leafMat = new MeshLambertMaterial({ map: leafTexture(), alphaTest: 0.5, side: DoubleSide });
  const wind = { value: 0 };
  leafMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // Viento: cuanto más lejos del tallo, más se mece la hoja
        vec3 base = instanceMatrix[3].xyz;
        float sway = sin(uTime * 1.3 + base.x * 0.7 + base.z * 0.45) * 0.5 + sin(uTime * 2.1 + base.z) * 0.25;
        transformed.y += sway * 0.09 * position.x * position.x;
        transformed.z += sway * 0.04 * position.x;`,
      );
  };
  const stemGeo = new CylinderGeometry(0.012, 0.02, 0.95, 5, 1, true);
  stemGeo.translate(0, 0.5, 0);
  const stemMat = new MeshLambertMaterial({ color: 0x6f8a3e });

  const sidesRows = mobile ? 4 : 6;
  const perRow = Math.floor(CHUNK / PLANT_GAP);
  const leavesPerPlant = mobile ? 7 : 9;
  const plantsPerChunk = sidesRows * 2 * perRow;

  const dummy = new Object3D();
  const leafM = new Matrix4();
  const tint = new Color();

  function buildChunk() {
    const group = new Group();
    const leaves = new InstancedMesh(leafGeo, leafMat, plantsPerChunk * leavesPerPlant);
    const stems = new InstancedMesh(stemGeo, stemMat, plantsPerChunk);
    let li = 0;
    let si = 0;
    for (let side = -sidesRows; side < sidesRows; side++) {
      // La cámara va por el pasillo central (x = 0)
      const rowX = (side + 0.5) * ROW_GAP + Math.sign(side + 0.5) * 0.35;
      for (let k = 0; k < perRow; k++) {
        const x = rowX + (rand() - 0.5) * 0.12;
        const z = -k * PLANT_GAP + (rand() - 0.5) * 0.15;
        const height = 1.05 + rand() * 0.55;
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, 0, (rand() - 0.5) * 0.08);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        stems.setMatrixAt(si++, dummy.matrix);
        const turn = rand() * Math.PI * 2;
        for (let j = 0; j < leavesPerPlant; j++) {
          const t = j / (leavesPerPlant - 1); // 0 abajo, 1 arriba
          const size = MathUtils.lerp(0.95, 0.42, t) * (0.85 + rand() * 0.3);
          dummy.position.set(x, 0.12 + t * height * 0.92, z);
          dummy.rotation.set(0, turn + j * 2.4, MathUtils.lerp(-0.05, 0.75, t) + (rand() - 0.5) * 0.2, 'YZX');
          dummy.scale.setScalar(size);
          dummy.updateMatrix();
          leafM.copy(dummy.matrix);
          leaves.setMatrixAt(li, leafM);
          // Hojas bajas más maduras y amarillentas, las de arriba más verdes
          tint.setHSL(0.21 + t * 0.04 + (rand() - 0.5) * 0.03, 0.42 + rand() * 0.12, 0.38 + (1 - t) * 0.06 + rand() * 0.05);
          leaves.setColorAt(li, tint);
          li++;
        }
      }
    }
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    group.add(leaves, stems);

    // Postes del tapado a lo largo del pasillo
    const postGeo = new CylinderGeometry(0.03, 0.035, 3.2, 6);
    postGeo.translate(0, 1.6, 0);
    const posts = new InstancedMesh(postGeo, new MeshLambertMaterial({ color: 0x5a412b }), Math.ceil(CHUNK / 6) * 2);
    let pi = 0;
    for (let z = 0; z > -CHUNK; z -= 6) {
      for (const x of [-ROW_GAP * 2 - 0.35, ROW_GAP * 2 + 0.35]) {
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        posts.setMatrixAt(pi++, dummy.matrix);
      }
    }
    group.add(posts);
    return group;
  }

  const chunks = [buildChunk(), buildChunk()];
  chunks[0].position.z = 0;
  chunks[1].position.z = -CHUNK;
  scene.add(...chunks);

  // Suelo y tapado siguen a la cámara; su textura se desplaza para simular el avance
  const soilTex = soilTexture();
  soilTex.repeat.set(30 / ROW_GAP, 30 / ROW_GAP);
  const soil = new Mesh(new PlaneGeometry(30, 30), new MeshLambertMaterial({ map: soilTex }));
  soil.rotation.x = -Math.PI / 2;
  scene.add(soil);
  // Alinea los surcos de la textura con las filas de plantas
  soilTex.offset.x = 0.5;

  const clothTex = clothTexture();
  clothTex.repeat.set(30 / 1.5, 30 / 1.5);
  const cloth = new Mesh(
    new PlaneGeometry(30, 30),
    new MeshBasicMaterial({ map: clothTex, transparent: true, opacity: 0.35, depthWrite: false, side: DoubleSide, fog: true }),
  );
  cloth.rotation.x = Math.PI / 2;
  cloth.position.y = 3.1;
  scene.add(cloth);

  // ---- Bucle ----
  const api: FieldScene = { travel: 0, paused: false, destroy };
  const view = { z: 0, sway: 0 };
  const pointer = { x: 0, tx: 0 };
  const timer = new Timer();
  timer.connect(document);
  let raf = 0;
  let running = true;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  const onVis = () => (running = !document.hidden);
  document.addEventListener('visibilitychange', onVis);

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!running || api.paused) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    if (!reducedMotion) {
      wind.value = t;
      api.travel += dt * 0.12; // la vega sigue avanzando despacio aunque no hagas scroll
    }

    view.z += (api.travel - view.z) * (1 - Math.exp(-dt * 3));
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    const z = -view.z;
    camera.position.set(Math.sin(t * 0.35) * 0.06, 1.95 + Math.sin(t * 0.6) * 0.03, z);
    camera.rotation.set(-0.3, -pointer.x * 0.12 + Math.sin(t * 0.2) * 0.02, 0, 'YXZ');

    // Turnar los tramos: el que queda detrás pasa delante
    for (const c of chunks) {
      if (c.position.z - CHUNK > z + 2) c.position.z -= CHUNK * 2;
    }
    soil.position.set(0, 0, z - 10);
    soilTex.offset.y = -(z - 10) / ROW_GAP;
    cloth.position.z = z - 10;
    clothTex.offset.y = (z - 10) / 1.5;

    renderer.render(scene, camera);
  };
  frame();

  function destroy() {
    cancelAnimationFrame(raf);
    timer.dispose();
    ro.disconnect();
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVis);
    scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mat = m.material as MeshLambertMaterial | undefined;
      mat?.map?.dispose();
      mat?.dispose?.();
    });
    renderer.dispose();
  }

  return api;
}
