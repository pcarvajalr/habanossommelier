import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  RepeatWrapping,
  Points,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Timer,
  TextureLoader,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { bandTextures, charTexture, emberTexture } from './textures';

/** Estado que GSAP anima con el scroll. x/y van normalizados al ancho/alto visibles (-1..1). */
export interface CigarState {
  x: number;
  y: number;
  scale: number;
  rx: number;
  ry: number;
  rz: number;
  glow: number;
  smoke: number;
}

export interface CigarScene {
  state: CigarState;
  /** Impulso de giro (por ejemplo, la velocidad del scroll). */
  kick(v: number): void;
  /** Con el habano oculto se deja de pintar para ahorrar batería. */
  paused: boolean;
  destroy(): void;
}

const LENGTH = 5;
const RADIUS = 0.37;

function cigarProfile(steps: number) {
  const pts: Vector2[] = [];
  const foot = -LENGTH / 2;
  const headLen = 0.5;
  const headStart = LENGTH / 2 - headLen;
  pts.push(new Vector2(0.0001, foot));
  pts.push(new Vector2(RADIUS * 0.96, foot));
  pts.push(new Vector2(RADIUS, foot + 0.015));
  for (let i = 1; i <= steps; i++) {
    const y = foot + 0.015 + ((headStart - foot - 0.015) * i) / steps;
    pts.push(new Vector2(RADIUS, y));
  }
  // Perilla: casquete algo aplanado, como una perilla de tres capas
  for (let i = 1; i <= 14; i++) {
    const a = (i / 14) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(0.0001, RADIUS * Math.cos(a)), headStart + headLen * Math.pow(Math.sin(a), 0.85)));
  }
  return pts;
}

/** Pequeñas irregularidades de un habano torcido a mano (no es un cilindro perfecto). */
function handRolled(geo: BufferGeometry, amount: number) {
  const p = geo.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-3) continue;
    const a = Math.atan2(z, x);
    const k =
      1 +
      amount *
        (Math.sin(y * 3.1 + a * 2) * 0.5 + Math.sin(y * 7.3 - a * 3 + 1.7) * 0.3 + Math.sin(a * 5 + y * 1.3) * 0.2);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function loadTexture(loader: TextureLoader, url: string, srgb: boolean) {
  return loader.loadAsync(url).then((t) => {
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
    return t;
  });
}

export async function createCigarScene(canvas: HTMLCanvasElement, opts: { mobile: boolean; reducedMotion: boolean }): Promise<CigarScene> {
  const { mobile, reducedMotion } = opts;
  await document.fonts?.ready;

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !mobile || window.devicePixelRatio < 2,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();

  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Luces cálidas de salón de fumadores
  scene.add(new AmbientLight(0xffe6c8, 0.25));
  const key = new DirectionalLight(0xffd9a8, 2);
  key.position.set(-4, 5, 6);
  scene.add(key);
  const rim = new DirectionalLight(0xc9a45c, 3);
  rim.position.set(5, -2, -4);
  scene.add(rim);

  // ---- Habano ----
  const root = new Group(); // posición y orientación (scroll)
  const tilt = new Group(); // parallax del puntero
  const cigar = new Group(); // giro sobre su propio eje
  root.add(tilt);
  tilt.add(cigar);
  scene.add(root);

  // Capa y ceniza sacadas de fotos reales de habanos
  const loader = new TextureLoader();
  const [capa, relieve, ceniza] = await Promise.all([
    loadTexture(loader, '/textures/capa.jpg', true),
    loadTexture(loader, '/textures/capa-relieve.jpg', false),
    loadTexture(loader, '/textures/ceniza.jpg', true),
  ]);
  capa.repeat.set(1, 1.3);
  relieve.repeat.copy(capa.repeat);

  const body = new Mesh(
    handRolled(new LatheGeometry(cigarProfile(mobile ? 40 : 80), mobile ? 64 : 128), 0.012),
    new MeshPhysicalMaterial({
      map: capa,
      bumpMap: relieve,
      bumpScale: 0.18,
      roughness: 0.62,
      metalness: 0,
      sheen: 0.2,
      sheenColor: new Color(0xd9a26a),
      sheenRoughness: 0.45,
      envMapIntensity: 0.55,
    }),
  );
  cigar.add(body);
  // El material físico deja un alfa menor que 1 y el habano se transparentaba sobre la vega
  (body.material as MeshPhysicalMaterial).onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a = 1.0;');
  };

  const bandMaps = bandTextures();
  const band = new Mesh(
    new CylinderGeometry(RADIUS * 1.012, RADIUS * 1.012, 0.56, mobile ? 64 : 128, 1, true),
    new MeshStandardMaterial({
      map: bandMaps.map,
      metalnessMap: bandMaps.metal,
      roughnessMap: bandMaps.metal,
      metalness: 1,
      roughness: 1,
      bumpMap: bandMaps.bump,
      bumpScale: 1.5,
      envMapIntensity: 0.7,
    }),
  );
  band.position.y = LENGTH / 2 - 1.05;
  band.rotation.y = -Math.PI / 2; // medallón hacia la cámara al inicio
  cigar.add(band);

  // Pie encendido: capa quemada, ceniza firme y brasa
  const ashLen = 0.55;
  const footY = -LENGTH / 2;
  const char = new Mesh(
    new CylinderGeometry(RADIUS * 1.004, RADIUS * 1.004, 0.4, mobile ? 64 : 128, 1, true),
    new MeshStandardMaterial({ map: charTexture(), transparent: true, depthWrite: false, roughness: 0.9 }),
  );
  char.position.y = footY + 0.2;
  cigar.add(char);

  ceniza.repeat.set(1, 1);
  const ashGeo = handRolled(new CylinderGeometry(RADIUS * 0.985, RADIUS * 0.93, ashLen, mobile ? 40 : 72, 8, false), 0.035);
  const ash = new Mesh(ashGeo, new MeshStandardMaterial({ map: ceniza, bumpMap: ceniza, color: 0xb8b2aa, bumpScale: 2, roughness: 1, metalness: 0, envMapIntensity: 0.3 }));
  ash.position.y = footY - ashLen / 2 + 0.01;
  cigar.add(ash);

  const emberMat = new MeshBasicMaterial({ color: new Color(1.5, 0.45, 0.12), transparent: true, opacity: 0.8, toneMapped: false });
  const ember = new Mesh(new TorusGeometry(RADIUS * 0.975, 0.014, 6, mobile ? 64 : 128), emberMat);
  ember.rotation.x = Math.PI / 2;
  ember.position.y = footY - 0.005;
  cigar.add(ember);

  const tipMat = new MeshBasicMaterial({ map: emberTexture(), transparent: true, opacity: 0.4, toneMapped: false, side: DoubleSide });
  const tip = new Mesh(new CircleGeometry(RADIUS * 0.9, 48), tipMat);
  tip.rotation.x = Math.PI / 2;
  tip.position.y = footY - ashLen + 0.004;
  cigar.add(tip);

  const glowLight = new PointLight(0xff6a24, 3, 3.5, 1.6);
  glowLight.position.y = footY - 0.1;
  cigar.add(glowLight);

  // ---- Humo ----
  const COUNT = reducedMotion ? 0 : mobile ? 60 : 140;
  const pos = new Float32Array(COUNT * 3);
  const life = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);
  const vel = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    life[i] = Math.random();
    seed[i] = Math.random();
    pos[i * 3 + 1] = -999;
  }
  const smokeGeo = new BufferGeometry();
  smokeGeo.setAttribute('position', new BufferAttribute(pos, 3));
  smokeGeo.setAttribute('aLife', new BufferAttribute(life, 1));
  smokeGeo.setAttribute('aSeed', new BufferAttribute(seed, 1));
  const smokeMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uScale: { value: 1 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aLife;
      attribute float aSeed;
      uniform float uScale;
      varying float vLife;
      varying float vSeed;
      void main() {
        vLife = aLife;
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (40.0 + aLife * 240.0) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vLife;
      varying float vSeed;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float n = sin((p.x + vSeed) * 9.0) * sin((p.y - vSeed) * 7.0) * 0.12;
        float a = smoothstep(0.5, 0.0, d + n) * (1.0 - vLife) * smoothstep(0.0, 0.12, vLife);
        gl_FragColor = vec4(vec3(0.78, 0.74, 0.7), a * 0.05 * uOpacity);
      }
    `,
  });
  const smoke = new Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  scene.add(smoke);

  // ---- Estado, tamaño y bucle ----
  const state: CigarState = { x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0, glow: 1, smoke: 1 };
  const view = { w: 1, h: 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let spinVel = 0;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.h = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    view.w = view.h * camera.aspect;
    smokeMat.uniforms.uScale.value = renderer.getPixelRatio() * (h / 900) * 9;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const timer = new Timer();
  timer.connect(document);
  const tipWorld = new Vector3();
  let spawnIdx = 0;
  let spawnAcc = 0;
  let raf = 0;
  let running = true;

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!running || api.paused) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    // El habano cabe siempre en pantalla: en móvil vertical se reduce.
    const fit = Math.min(1, (view.w * 2 * 0.92) / LENGTH, (view.h * 2 * 0.92) / LENGTH);
    root.position.set(state.x * view.w, state.y * view.h + (reducedMotion ? 0 : Math.sin(t * 0.8) * 0.06), 0);
    root.rotation.set(state.rx, state.ry, state.rz);
    root.scale.setScalar(state.scale * fit);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    tilt.rotation.x = pointer.y * 0.25;
    tilt.rotation.z = -pointer.x * 0.15;

    spinVel *= 0.94;
    if (!reducedMotion) cigar.rotation.y += dt * 0.35 + spinVel * dt;

    const flicker = 0.85 + Math.sin(t * 7.1) * 0.06 + Math.sin(t * 13.7) * 0.05 + Math.random() * 0.04;
    glowLight.intensity = 3 * state.glow * flicker;
    emberMat.opacity = Math.min(1, 0.5 + 0.5 * state.glow * flicker);
    tipMat.opacity = 0.35 + 0.35 * state.glow * flicker;

    // Partículas de humo desde la ceniza, en coordenadas de la escena
    if (COUNT) {
      tipWorld.set(0, footY - ashLen, 0);
      cigar.localToWorld(tipWorld);
      spawnAcc += dt * COUNT * 0.18;
      while (spawnAcc > 1) {
        spawnAcc -= 1;
        const i = spawnIdx++ % COUNT;
        life[i] = 0;
        pos[i * 3] = tipWorld.x + (Math.random() - 0.5) * 0.1;
        pos[i * 3 + 1] = tipWorld.y;
        pos[i * 3 + 2] = tipWorld.z + (Math.random() - 0.5) * 0.1;
        vel[i * 3] = (Math.random() - 0.5) * 0.12;
        vel[i * 3 + 1] = 0.35 + Math.random() * 0.3;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
      }
      for (let i = 0; i < COUNT; i++) {
        if (life[i] >= 1) continue;
        life[i] = Math.min(1, life[i] + dt * 0.22);
        const k = i * 3;
        const curl = Math.sin(t * 1.3 + seed[i] * 12 + pos[k + 1] * 2.1) * 0.25;
        pos[k] += (vel[k] + curl) * dt;
        pos[k + 1] += vel[k + 1] * dt;
        pos[k + 2] += vel[k + 2] * dt;
      }
      smokeGeo.attributes.position.needsUpdate = true;
      smokeGeo.attributes.aLife.needsUpdate = true;
      smokeMat.uniforms.uOpacity.value = state.smoke;
    }

    renderer.render(scene, camera);
  };
  const onVis = () => {
    running = !document.hidden;
  };
  document.addEventListener('visibilitychange', onVis);

  const api: CigarScene = {
    state,
    paused: false,
    kick(v: number) {
      spinVel = Math.max(-6, Math.min(6, spinVel + v));
    },
    destroy() {
      cancelAnimationFrame(raf);
      timer.dispose();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mat = m.material as MeshStandardMaterial | undefined;
        mat?.map?.dispose();
        mat?.bumpMap?.dispose();
        mat?.dispose?.();
      });
      env.dispose();
      renderer.dispose();
    },
  };
  frame();
  return api;
}
