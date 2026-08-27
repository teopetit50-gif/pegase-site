/* Moteur WebGL du hero — pipeline façon Active Theory :
   simulation GPGPU (positions/vélocités en FBO float, curl noise 3D dans le
   fragment shader), rendu points additifs à sprite doux, UnrealBloom + ACES
   + grain. Chargé dynamiquement après le LCP par HeroScene.tsx.

   Interactions : drift caméra permanent, parallaxe souris amortie, la souris
   injecte une force 3D dans le champ, le clic émet une onde radiale, le
   scroll fait avancer la caméra DANS le champ (dolly-through). */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GPUComputationRenderer, type Variable } from "three/examples/jsm/misc/GPUComputationRenderer.js";

/* —————————————————— GLSL partagé : simplex + curl —————————————————— */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
vec3 curl(vec3 p){
  const float e = 0.12;
  float n1 = snoise(p + vec3(0.0,  e, 0.0));
  float n2 = snoise(p - vec3(0.0,  e, 0.0));
  float n3 = snoise(p + vec3(0.0, 0.0,  e));
  float n4 = snoise(p - vec3(0.0, 0.0,  e));
  float n5 = snoise(p + vec3( e, 0.0, 0.0));
  float n6 = snoise(p - vec3( e, 0.0, 0.0));
  vec3 c = vec3((n1-n2)-(n3-n4), (n3-n4)-(n5-n6), (n5-n6)-(n1-n2));
  return normalize(c + 0.00001);
}
`;

/* —————————————————— shaders de simulation —————————————————— */

const VELOCITY_SHADER = /* glsl */ `
uniform float uTime;
uniform float uDt;
uniform float uFlow;
uniform vec3  uMouse;
uniform float uMouseForce;
uniform vec3  uClick;
uniform float uClickTime;
${NOISE}
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos4 = texture2D(texturePosition, uv);
  vec4 vel4 = texture2D(textureVelocity, uv);
  vec3 pos = pos4.xyz;
  vec3 vel = vel4.xyz;
  float seed = vel4.w;

  // écoulement : curl noise qui dérive lentement + swirl le long de la plume
  vec3 c = curl(pos * 0.085 + vec3(0.0, 0.0, uTime * 0.05) + seed * 0.13);
  vec3 tang = normalize(vec3(-pos.y, pos.x * 0.55, 0.4 * sin(seed * 6.28)));
  vec3 target = c * uFlow + tang * 0.55;
  vel = mix(vel, target, 0.028);

  // la souris déforme le champ (force 3D, amortie côté CPU)
  vec3 dm = pos - uMouse;
  float dl2 = dot(dm, dm);
  vel += (dm / sqrt(dl2 + 0.001)) * uMouseForce * exp(-dl2 * 0.018) * uDt * 60.0;

  // onde de clic : anneau qui écarte puis relâche
  float ct = uTime - uClickTime;
  if (ct > 0.0 && ct < 2.5) {
    vec3 dc = pos - uClick;
    float d = length(dc) + 0.001;
    float waveR = ct * 16.0;
    float band = exp(-pow(d - waveR, 2.0) * 0.06);
    vel += (dc / d) * band * exp(-ct * 1.6) * 2.6 * uDt * 60.0;
  }

  gl_FragColor = vec4(vel, seed);
}
`;

const POSITION_SHADER = /* glsl */ `
uniform float uTime;
uniform float uDt;
uniform sampler2D uSpawn;
${NOISE}
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos4 = texture2D(texturePosition, uv);
  vec4 vel4 = texture2D(textureVelocity, uv);
  float life = pos4.w - uDt / (6.0 + fract(vel4.w * 57.31) * 9.0);
  vec3 pos = pos4.xyz + vel4.xyz * uDt * 1.35;
  if (life <= 0.0) {
    vec4 sp = texture2D(uSpawn, uv);
    // renaissance : point d'origine sculpté par le bruit du moment
    pos = sp.xyz + curl(sp.xyz * 0.2 + uTime * 0.11) * (0.7 + sp.w * 1.1);
    life = 1.0;
  }
  gl_FragColor = vec4(pos, life);
}
`;

/* —————————————————— shaders de rendu des points —————————————————— */

const POINT_VERT = /* glsl */ `
uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float uScale;
uniform float uPointSize;
uniform float uDrawFraction;
uniform float uGlobalAlpha;
uniform float uMaxPx;
attribute vec2 aRef;
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 pos4 = texture2D(texturePosition, aRef);
  vec4 vel4 = texture2D(textureVelocity, aRef);
  float life = pos4.w;

  // palier de qualité : on éteint une fraction des particules
  float on = step(fract(aSeed * 91.17), uDrawFraction);

  vec4 mv = modelViewMatrix * vec4(pos4.xyz, 1.0);
  gl_Position = projectionMatrix * mv;

  float speed = length(vel4.xyz);
  float fade = smoothstep(0.0, 0.22, life) * smoothstep(1.0, 0.88, life);

  float sizeSeed = fract(aSeed * 37.7);
  float base = sizeSeed < 0.92 ? (0.5 + sizeSeed) : (1.6 + (sizeSeed - 0.92) * 8.0);
  float px = base * uPointSize * fade * uScale / max(0.6, -mv.z);
  gl_PointSize = on * min(px, uMaxPx);

  // les particules qui frôlent la caméra s'effacent (dolly-through propre,
  // sinon l'additif sature en blanc)
  float nearFade = smoothstep(1.8, 6.0, -mv.z);

  // rampe stricte Omega : ~88 % de poussière froide FAIBLE, braises réservées
  // au cœur du ruban, blanc pur limité aux pics (~1.5 %)
  float cs = fract(aSeed * 17.31);
  vec3 col; float amp;
  if      (cs < 0.070) { col = vec3(0.969, 0.514, 0.125); amp = 1.35; } // braise #f78320
  else if (cs < 0.115) { col = vec3(0.878, 0.702, 0.255); amp = 1.25; } // or #e0b341
  else if (cs < 0.130) { col = vec3(1.0);                 amp = 0.90; } // blanc : pics seulement
  else                 { col = vec3(0.843, 0.863, 0.910); amp = 0.11; } // poussière #d7dce8, alpha bas
  // les particules rapides chauffent — modérément, pour ne pas blanchir la poussière
  col *= 0.62 + min(speed * 0.45, 0.95);
  vColor = col;
  vAlpha = fade * nearFade * uGlobalAlpha * amp * (0.35 + 0.65 * fract(aSeed * 7.91));
}
`;

const POINT_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;
  float a = pow(1.0 - smoothstep(0.0, 0.25, r2), 2.2);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

/* —————————————————— grain + vignette (après tone mapping) —————————————————— */

const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // scrim : le champ s'assombrit doucement derrière la colonne de texte
      // centrée — n'agit que sur la lumière des particules
      vec2 tc = (vUv - vec2(0.5, 0.5)) / vec2(0.28, 0.48);
      c.rgb *= 1.0 - 0.35 * (1.0 - smoothstep(0.6, 1.35, length(tc)));
      // feather : la lumière s'éteint en fondu avant chaque bord du canvas —
      // aucune particule ne peut se couper net sur une ligne
      float ef = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x)
               * smoothstep(0.0, 0.10, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
      c.rgb *= ef;
      float v = smoothstep(1.35, 0.35, length(vUv - 0.5) * 1.5); // vignette douce
      c.rgb *= 0.82 + 0.18 * v;
      // grain uniquement là où il y a de la lumière — jamais sur le fond
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += (hash(vUv * 917.0) - 0.5) * 0.028 * smoothstep(0.0, 0.12, lum);
      // le fond de page est noir pur (#000, body var(--panel)) : le vide du
      // canvas rend 0 = pixel-identique au fond — aucune frontière possible
      gl_FragColor = c;
    }
  `,
};

/* —————————————————— moteur —————————————————— */

export type HeroEngine = { destroy(): void };

export async function createHeroScene(
  host: HTMLElement,
  onReady: () => void
): Promise<HeroEngine> {
  /* ——— paliers de qualité ——— */
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mobile = coarse || window.innerWidth < 820;
  const strong = !mobile && (navigator.hardwareConcurrency || 4) >= 8;
  const SIM = mobile ? 208 : strong ? 500 : 400; // 43k / 250k / 160k particules
  const COUNT = SIM * SIM;
  let dprCap = mobile ? 1.25 : strong ? 1.5 : 1.35;

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  // noir pur : le fond de page est réinjecté en passe finale (voir GrainShader),
  // sinon le tone mapping ACES assombrit le clear color et le cadre se voit
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 1.2s ease;";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  const CAM_Z = 26;
  camera.position.set(0, 0, CAM_Z);

  /* ——— spawn : ruban elliptique réduit et décentré — le cœur vit dans le
     tiers droit du cadre, sous la ligne du titre ; le tiers gauche et le
     haut restent noirs (règle des tiers, un seul point focal) ——— */
  const spawnData = new Float32Array(COUNT * 4);
  const tiltX = -0.52, tiltZ = -0.30;
  const cX = Math.cos(tiltX), sX = Math.sin(tiltX);
  const cZ = Math.cos(tiltZ), sZ = Math.sin(tiltZ);
  // l'offset s'adapte au ratio du panel : le cœur vise u≈0.65 quel que soit
  // le format de fenêtre (offset fixe = cœur coupé au bord en fenêtre étroite)
  const r0 = host.getBoundingClientRect();
  const aspect0 = Math.max(0.6, r0.width / Math.max(1, r0.height));
  const halfH0 = Math.tan((50 * Math.PI) / 360) * CAM_Z;
  const off = mobile
    ? { x: 2.2, y: -3.2 }
    : { x: 0.3 * halfH0 * aspect0, y: -0.6 };
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.816;
  for (let i = 0; i < COUNT; i++) {
    // densité fortement asymétrique le long de l'anneau : un arc dense (le
    // ruban et son cœur), l'arc opposé ~5× plus clairsemé — pas un donut
    let th = Math.random() * Math.PI * 2;
    for (
      let t = 0;
      t < 4 && Math.random() > 0.18 + 0.82 * (0.5 + 0.5 * Math.sin(th + 1.1));
      t++
    )
      th = Math.random() * Math.PI * 2;
    const band = 1 + gauss() * 0.22;
    let x = Math.cos(th) * 8.2 * band;
    let y = Math.sin(th) * 2.9 * band;
    let z = gauss() * 1.2;
    // inclinaison X puis Z
    let y2 = y * cX - z * sX, z2 = y * sX + z * cX;
    let x3 = x * cZ - y2 * sZ, y3 = x * sZ + y2 * cZ;
    spawnData[i * 4 + 0] = x3 + off.x;
    spawnData[i * 4 + 1] = y3 + off.y;
    spawnData[i * 4 + 2] = z2;
    spawnData[i * 4 + 3] = Math.random();
  }
  const spawnTex = new THREE.DataTexture(spawnData, SIM, SIM, THREE.RGBAFormat, THREE.FloatType);
  spawnTex.needsUpdate = true;

  /* ——— GPGPU ——— */
  const gpu = new GPUComputationRenderer(SIM, SIM, renderer);
  if (mobile) gpu.setDataType(THREE.HalfFloatType);
  const pos0 = gpu.createTexture();
  const vel0 = gpu.createTexture();
  {
    const p = pos0.image.data as Float32Array;
    const v = vel0.image.data as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      p[i * 4 + 0] = spawnData[i * 4 + 0];
      p[i * 4 + 1] = spawnData[i * 4 + 1];
      p[i * 4 + 2] = spawnData[i * 4 + 2];
      p[i * 4 + 3] = Math.random(); // vie initiale étalée → pas de respawn synchrone
      v[i * 4 + 0] = 0;
      v[i * 4 + 1] = 0;
      v[i * 4 + 2] = 0;
      v[i * 4 + 3] = Math.random(); // seed
    }
  }
  const velVar: Variable = gpu.addVariable("textureVelocity", VELOCITY_SHADER, vel0);
  const posVar: Variable = gpu.addVariable("texturePosition", POSITION_SHADER, pos0);
  gpu.setVariableDependencies(velVar, [posVar, velVar]);
  gpu.setVariableDependencies(posVar, [posVar, velVar]);
  const velU = velVar.material.uniforms as Record<string, THREE.IUniform>;
  velU.uTime = { value: 0 };
  velU.uDt = { value: 1 / 60 };
  velU.uFlow = { value: 1.15 };
  velU.uMouse = { value: new THREE.Vector3(999, 999, 0) };
  velU.uMouseForce = { value: 0 };
  velU.uClick = { value: new THREE.Vector3(999, 999, 0) };
  velU.uClickTime = { value: -10 };
  const posU = posVar.material.uniforms as Record<string, THREE.IUniform>;
  posU.uTime = { value: 0 };
  posU.uDt = { value: 1 / 60 };
  posU.uSpawn = { value: spawnTex };
  const gpuError = gpu.init();
  if (gpuError !== null) throw new Error(gpuError);

  /* ——— points ——— */
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  const refs = new Float32Array(COUNT * 2);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    refs[i * 2 + 0] = ((i % SIM) + 0.5) / SIM;
    refs[i * 2 + 1] = (Math.floor(i / SIM) + 0.5) / SIM;
    seeds[i] = Math.random();
  }
  geo.setAttribute("aRef", new THREE.BufferAttribute(refs, 2));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      texturePosition: { value: null },
      textureVelocity: { value: null },
      uScale: { value: 1 },
      uPointSize: { value: mobile ? 0.075 : 0.05 },
      uDrawFraction: { value: 1 },
      uGlobalAlpha: { value: 0.3 },
      uMaxPx: { value: 22 },
    },
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(geo, mat));

  /* ——— post-processing : bloom → ACES/sRGB → grain ——— */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(mobile ? 240 : 512, mobile ? 240 : 512),
    mobile ? 0.45 : 0.5, // strength, le bloom ne s'allume que sur le cœur du ruban
    0.8, // radius
    0.55 // threshold : la poussière ne bloome jamais
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass(GrainShader);
  composer.addPass(grain);

  /* ——— état interactions : la souris ne touche JAMAIS le champ (demande
     Teo 20/07) — pas de force, pas d'onde au clic. Seule une parallaxe
     caméra très douce subsiste, elle ne déplace aucune particule ——— */
  const panel = host.parentElement ?? host;
  const ndc = new THREE.Vector2(999, 999);
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  let running = true, inView = true, tabVisible = true;

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    parallax.tx = ndc.x;
    parallax.ty = ndc.y;
  };
  const onLeave = () => {
    parallax.tx = 0;
    parallax.ty = 0;
  };
  const onVis = () => {
    tabVisible = document.visibilityState === "visible";
  };
  const io = new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
  });
  io.observe(host);

  const resize = () => {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(r.width, r.height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    (mat.uniforms.uScale as THREE.IUniform).value =
      (r.height * dpr * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
    (mat.uniforms.uMaxPx as THREE.IUniform).value = 11 * dpr;
  };
  resize();

  /* ——— boucle ——— */
  let lastNow = performance.now();
  let simTime = 0;
  let raf = 0;
  let frames = 0, fpsAccum = 0, fpsAvg = 0, lastFpsLog = 0, degraded = 0, lowStreak = 0;
  let firstFrame = true;

  const fpsOverlay = location.search.includes("fps")
    ? (() => {
        const d = document.createElement("div");
        d.style.cssText =
          "position:fixed;top:70px;left:10px;z-index:9999;background:#000a;color:#0f0;font:12px monospace;padding:4px 8px;border-radius:4px;pointer-events:none";
        document.body.appendChild(d);
        return d;
      })()
    : null;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!inView || !tabVisible) return;
    const now = performance.now();
    const dt = Math.min((now - lastNow) / 1000, 1 / 30);
    lastNow = now;
    simTime += dt;

    // FPS
    frames++;
    fpsAccum += dt;
    if (fpsAccum >= 1) {
      fpsAvg = frames / fpsAccum;
      frames = 0;
      fpsAccum = 0;
      (window as unknown as Record<string, unknown>).__pegaseFPS = Math.round(fpsAvg);
      if (fpsOverlay) fpsOverlay.textContent = `${Math.round(fpsAvg)} fps · ${COUNT.toLocaleString()} pts`;
      if (simTime - lastFpsLog > 3 && simTime < 16) {
        lastFpsLog = simTime;
        console.info(`[pegase-hero] ${Math.round(fpsAvg)} fps : ${COUNT} particules, palier ${degraded}`);
      }
      // paliers auto : on ignore les 3 premières secondes (compilation des
      // shaders) et on exige deux mesures basses consécutives avant de dégrader
      if (simTime > 3) {
        lowStreak = fpsAvg < 27 ? lowStreak + 1 : 0;
        if (lowStreak >= 2 && degraded === 0) {
          degraded = 1;
          lowStreak = 0;
          dprCap = Math.max(1, dprCap - 0.5);
          (mat.uniforms.uDrawFraction as THREE.IUniform).value = 0.65;
          bloom.strength *= 0.85;
          resize();
        } else if (lowStreak >= 2 && fpsAvg < 20 && degraded === 1) {
          degraded = 2;
          lowStreak = 0;
          (mat.uniforms.uDrawFraction as THREE.IUniform).value = 0.4;
          resize();
        }
      }
    }

    // simulation
    velU.uTime.value = simTime;
    velU.uDt.value = dt;
    posU.uTime.value = simTime;
    posU.uDt.value = dt;
    gpu.compute();
    const posTex = gpu.getCurrentRenderTarget(posVar).texture;
    const velTex = gpu.getCurrentRenderTarget(velVar).texture;
    (mat.uniforms.texturePosition as THREE.IUniform).value = posTex;
    (mat.uniforms.textureVelocity as THREE.IUniform).value = velTex;

    // caméra : drift permanent + parallaxe — pas de dolly au scroll, la
    // nébuleuse reste flottante derrière le contenu
    parallax.x += (parallax.tx - parallax.x) * 0.045;
    parallax.y += (parallax.ty - parallax.y) * 0.045;
    const driftX = Math.sin(simTime * 0.11) * 0.9;
    const driftY = Math.cos(simTime * 0.09) * 0.55;
    const driftZ = Math.sin(simTime * 0.055) * 1.1;
    camera.position.set(
      driftX + parallax.x * 1.9,
      driftY + parallax.y * 1.1,
      CAM_Z + driftZ
    );
    camera.rotation.z = Math.sin(simTime * 0.07) * 0.02;
    camera.lookAt(parallax.x * 2.2, parallax.y * 1.3, 0);

    grain.uniforms.uTime.value = simTime % 100;
    composer.render();

    if (firstFrame) {
      firstFrame = false;
      canvas.style.opacity = "1";
      onReady();
    }
  };

  window.addEventListener("resize", resize);
  panel.addEventListener("pointermove", onMove);
  panel.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      panel.removeEventListener("pointermove", onMove);
      panel.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      fpsOverlay?.remove();
      geo.dispose();
      mat.dispose();
      spawnTex.dispose();
      gpu.dispose();
      composer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
