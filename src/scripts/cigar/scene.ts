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
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Points,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Timer,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ashTexture, bandTexture, emberTexture, wrapperTextures } from './textures';

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

const LENGTH = 5.2;
const RADIUS = 0.3;

function cigarProfile(steps: number) {
  const pts: Vector2[] = [];
  const foot = -LENGTH / 2;
  const headStart = LENGTH / 2 - 0.55;
  pts.push(new Vector2(0.0001, foot));
  pts.push(new Vector2(RADIUS * 0.97, foot));
  pts.push(new Vector2(RADIUS, foot + 0.02));
  for (let i = 1; i <= steps; i++) {
    const y = foot + 0.02 + ((headStart - foot - 0.02) * i) / steps;
    // Ligera curvatura del cuerpo, como un habano torcido a mano
    const t = i / steps;
    pts.push(new Vector2(RADIUS * (1 + 0.012 * Math.sin(t * Math.PI)), y));
  }
  // Perilla redondeada
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(0.0001, RADIUS * Math.cos(a)), headStart + 0.55 * Math.sin(a)));
  }
  return pts;
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
  const key = new DirectionalLight(0xffd9a8, 2.4);
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

  const tex = wrapperTextures(mobile ? 1024 : 2048);
  tex.map.repeat.set(1, 3);
  tex.bump.repeat.set(1, 3);
  const body = new Mesh(
    new LatheGeometry(cigarProfile(mobile ? 24 : 48), mobile ? 48 : 96),
    new MeshStandardMaterial({
      map: tex.map,
      bumpMap: tex.bump,
      bumpScale: 1.2,
      roughness: 0.62,
      metalness: 0,
      envMapIntensity: 0.6,
    }),
  );
  cigar.add(body);

  const band = new Mesh(
    new CylinderGeometry(RADIUS * 1.018, RADIUS * 1.018, 0.62, mobile ? 48 : 96, 1, true),
    new MeshStandardMaterial({ map: bandTexture(), roughness: 0.32, metalness: 0.45, envMapIntensity: 1.2 }),
  );
  band.position.y = LENGTH / 2 - 1.15;
  cigar.add(band);

  // Ceniza y brasa en el pie
  const ashLen = 0.42;
  const ash = new Mesh(
    new CylinderGeometry(RADIUS * 0.97, RADIUS * 0.95, ashLen, mobile ? 32 : 64, 1, false),
    new MeshStandardMaterial({ map: ashTexture(), roughness: 1, metalness: 0 }),
  );
  ash.position.y = -LENGTH / 2 - ashLen / 2 + 0.01;
  cigar.add(ash);

  const emberMat = new MeshBasicMaterial({ color: new Color(1.6, 0.55, 0.18), transparent: true, opacity: 0.9, toneMapped: false });
  const ember = new Mesh(new TorusGeometry(RADIUS * 0.985, 0.022, 8, mobile ? 48 : 96), emberMat);
  ember.rotation.x = Math.PI / 2;
  ember.position.y = -LENGTH / 2 + 0.005;
  cigar.add(ember);

  const tipMat = new MeshBasicMaterial({ map: emberTexture(), transparent: true, opacity: 0.55, toneMapped: false, side: DoubleSide });
  const tip = new Mesh(new CircleGeometry(RADIUS * 0.94, 48), tipMat);
  tip.rotation.x = Math.PI / 2;
  tip.position.y = -LENGTH / 2 - ashLen + 0.005;
  cigar.add(tip);

  const glowLight = new PointLight(0xff6a24, 3, 3.5, 1.6);
  glowLight.position.y = -LENGTH / 2 - 0.1;
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
      tipWorld.set(0, -LENGTH / 2 - ashLen, 0);
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
