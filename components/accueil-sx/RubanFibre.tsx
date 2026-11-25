"use client";

/* ══════════════════════════════════════════════════════════════════════
   LE RUBAN DE FIBRES — décalque du « Fibre Arc » de la référence
   (un gabarit de page « logiciel IA » publié sur 21st.dev), 25/11/2026.

   Un seul shader, deux usages :
     · variante « arc »   — l'anneau vu en perspective du héros, qui suit
                            le pointeur ;
     · variante « droit » — la coupe droite du même ruban, posée en fond
                            des bandeaux « résumé de l'agent ».

   Le dessin (ellipse inclinée, torsion, quarante brins, zone vitreuse du
   bas) est repris tel quel : c'est lui qui fait la ressemblance, et le
   déplacer d'un degré se voit. SEUL ÉCART VOULU PAR TEO : la palette du
   héros, bleue (BLEU ci-dessous) au lieu de l'orangé de la référence
   (ORIGINE). Les bandeaux droits gardent la palette d'origine.

   Cadence : 30 images/s au plus, à l'arrêt hors écran, onglet caché ou
   « mouvement réduit » (une image fixe est alors dessinée).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, type CSSProperties } from "react";

const PAS_MS = 1000 / 30;

/** La palette de la référence — bleu-violet, puis rouges et orangés. */
export const ORIGINE = ["#2D00F7", "#F4001D", "#F21A00", "#DD3700", "#F06A00", "#F28900"];
/** La palette du héros d'Omega : même rampe, toute en bleus. */
export const BLEU = ["#1D0FBF", "#0B36F0", "#0A55FF", "#0A78FF", "#229FFA", "#67CAF2"];

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uBottomExtension;
uniform float uStraight;
uniform float uPixelRatio;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;

uniform vec3  uBg, uHigh, uInk;
uniform vec3  uPal[6];
uniform vec2  uCenter, uRadii;
uniform float uTilt;
uniform float uStrands, uWidth, uTwist, uThin, uComb, uReach, uDir, uGlow;

const float TAU = 6.28318531;

float sat(float x){ return clamp(x, 0.0, 1.0); }
float pw(float x, float e){ return pow(max(x, 1e-5), e); }
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 34.56); return fract(p.x * p.y); }

// Palette : six arrêts (prop 'couleurs'), fondus de 0 à 1.
vec3 spectrum(float h){
  h = clamp(h, 0.0, 1.0);
  // Give blue a slightly wider band before transitioning into the warm stops.
  h = h < 0.26 ? h / 0.26 : 1.0 + (h - 0.26) * (4.0 / 0.74);
  float f = fract(h); f = f * f * (3.0 - 2.0 * f);
  if (h < 1.0) return mix(uPal[0], uPal[1], f);
  if (h < 2.0) return mix(uPal[1], uPal[2], f);
  if (h < 3.0) return mix(uPal[2], uPal[3], f);
  if (h < 4.0) return mix(uPal[3], uPal[4], f);
  return mix(uPal[4], uPal[5], h >= 5.0 ? 1.0 : f);
}
// Palette runs across the ribbon, with a slow shimmer travelling along it.
float hue(float a01, float th, float t){ return 0.06 + 0.88 * a01 + 0.04 * sin(th * 3.0 - t * 0.4); }

// Shared lighting for the curved ribbon and its straight cross-section.
vec3 ribbonBody(float colorPosition, float across, float rim) {
  vec3 body = mix(spectrum(colorPosition), uHigh, 0.12);
  body = mix(body, body * 0.45, rim * 0.55);
  return mix(body, uHigh, 0.35 * pw(1.0 - abs(across - 0.25), 6.0));
}

float fibreProfile(float width, float distance) {
  return pw(width / (width + distance), 3.2);
}

vec3 straightFibres(vec2 uv) {
  vec2 normal = vec2(0.39, -0.9208);
  vec2 pixel = uv * uRes / uPixelRatio;
  float span = dot(uRes / uPixelRatio, abs(normal));
  float transverse = dot(pixel, normal) + uRes.y / uPixelRatio * abs(normal.y);
  float colorPosition = sat(transverse / span);
  float across = colorPosition * 2.0 - 1.0;
  float rim = smoothstep(0.72, 1.0, abs(across));
  vec3 body = ribbonBody(colorPosition, across, rim);

  // Offset neighbouring strands and overlap their soft profiles to avoid a regular hatch.
  const float pitch = 2.1;
  float index = floor(transverse / pitch);
  float core = 0.0;
  vec3 fibreColor = vec3(0.0);
  for (int i = -1; i <= 1; i++) {
    float strand = index + float(i);
    float variation = hash21(vec2(strand, 1.7));
    float center = (strand + 0.5 + (variation - 0.5) * 0.58) * pitch;
    float width = mix(0.55, 1.15, variation);
    float profile = fibreProfile(width, abs(transverse - center));
    core += profile;
    fibreColor += profile * spectrum(sat(center / span));
  }
  fibreColor /= max(core, 1e-4);
  return mix(body, fibreColor * 0.7, sat(core * 0.16 / (1.0 + core * 0.06)));
}

void main(){
  if (uStraight > 0.5) {
    gl_FragColor = vec4(straightFibres(gl_FragCoord.xy / uRes), 1.0);
    return;
  }
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = (gl_FragCoord.xy - vec2(0.0, uBottomExtension)) / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime;
  float px = 1.0 / uRes.y;

  float cs = cos(uDir), sn = sin(uDir);
  mat2 rot = mat2(cs, sn, -sn, cs);
  vec2 q  = rot * p;
  vec2 pm = q - rot * ((uMouse - 0.5) * vec2(ar, 1.0));
  vec2 ps = q - normalize(pm + vec2(1e-5)) * uComb * 0.10 * sat(uHover)
            * exp(-dot(pm, pm) / max(uReach * uReach, 1e-4));

  // Centreline: a tilted ellipse (a ring seen in perspective).
  float ct = cos(uTilt), st = sin(uTilt);
  vec2 e = ps - uCenter;
  e = vec2(ct * e.x + st * e.y, -st * e.x + ct * e.y);
  float k0 = length(e / uRadii), k1 = length(e / (uRadii * uRadii));
  float d0 = k0 * (k0 - 1.0) / max(k1, 1e-4);     // signed distance to centreline
  float th = atan(e.y / uRadii.y, e.x / uRadii.x); // position along the ring

  // Ribbon half-width, with a waist where the ribbon twists.
  float node = 1.0 + 0.03 * sin(t * 0.3);
  float u_ = th - node;
  float side = smoothstep(-0.5, 0.5, u_);        // same slope both sides: no kink at the twist
  float tw = sin(clamp(mix(0.75, 1.5, side) * uTwist * u_, -1.5708, 1.5708));   // gentler slope: a longer, smoother twist
  float waist = sqrt(tw * tw + 0.3);   // keeps ~55% width at the twist
  float turn = tw / waist;               // smooth -1..1: colours swap sides through the twist
  float half_ = 0.5 * uWidth * mix(1.0, 1.25, side) * (1.0 + 0.6 * sat(uCenter.y + 0.5 - ps.y)) * waist / 1.14;   // normalise so full width stays the same away from the twist
  float across = clamp(d0 / half_, -1.0, 1.0);

  // Glassy toward the bottom of the ring.
  float vis = mix(0.10, 1.0, smoothstep(uCenter.y + 0.15 * uRadii.y, uCenter.y + 0.73 * uRadii.y, ps.y));

  // Band body
  float inside = 1.0 - smoothstep(half_ - 1.5 * px, half_ + 1.5 * px, abs(d0));
  float a01 = 0.5 + 0.5 * across * turn;
  float rim = smoothstep(0.72, 1.0, abs(across));
  vec3 body = ribbonBody(hue(a01, th, t), across, rim);

  vec3 col = vec3(0.0);
  col = mix(col, uInk, inside * (1.0 - vis) * 0.35);    // clear-glass tint where faded
  col = mix(col, body, inside * 0.9 * vis);
  col = mix(col, uInk, inside * rim * (1.0 - vis) * 0.5);   // glass edges

  // Fibres
  float core = 0.0, lines = 0.0;
  vec3 fcol = vec3(0.0), lcol = vec3(0.0);
  for(int i = 0; i < 40; i++){
    float fi = float(i);
    float on = sat(uStrands - fi);
    float f = fi / max(uStrands - 1.0, 1.0);
    float jit = hash21(vec2(fi, 1.7));
    float o = (f - 0.5) * 2.0 * half_ * (0.94 + 0.06 * jit) + 0.003 * sin(t * 0.5 + fi + th * 2.0);
    float dd = abs(d0 - o);
    float w = uThin * (0.0007 + 0.0016 * jit);
    float c = on * fibreProfile(w, dd);
    core += c;
    vec3 sc = spectrum(hue(0.5 + (f - 0.5) * turn, th, t));
    fcol += c * sc;
    // Sharp filament for the glow mode; every other strand is brighter for variety.
    float wl = 0.0009 * uThin;
    float l = on * pw(wl / (wl + dd), 2.6) * (0.35 + 0.65 * step(0.45, jit));
    lines += l;
    lcol += l * sc;
  }
  fcol /= max(core, 1e-4);
  float fa = sat(core * 0.16 / (1.0 + core * 0.06)) * mix(0.35, 1.0, vis);
  col = mix(col, mix(fcol * 0.7, uHigh, 0.35 * sat(core * 0.15 - 0.3)), fa);

  // Glow for dark backgrounds: a soft halo around the ribbon plus hot fibre cores,
  // added on top like the original Fibre Arc. Off when uGlow is 0.
  float outside = max(abs(d0) - half_, 0.0);
  float gw = 0.05 * (0.6 + 0.4 * uGlow);
  float halo = pw(gw / (gw + outside), 1.6) * (1.0 - 0.75 * inside);
  float bloom = pw(0.16 / (0.16 + outside), 2.0);   // wide, faint outer bloom
  vec3 hcol = spectrum(hue(0.5 + 0.5 * sign(d0) * turn, th, t));
  float gv = mix(0.25, 1.0, vis);
  lcol /= max(lines, 1e-4);
  col += uGlow * gv * (hcol * halo * 0.85
                     + hcol * bloom * 0.18
                     + body * inside * 0.35                       // body lit from within
                     + fcol * sat(core * 0.05) * 0.35
                     + mix(lcol, uHigh, 0.45 * sat(lines - 0.6)) * sat(lines * 0.9) * 0.35);

  // Composite only the ribbon, fibres and glow over the existing canvas.
  float coverage = 1.0 - (1.0 - inside * (1.0 - vis) * 0.35)
    * (1.0 - inside * 0.9 * vis)
    * (1.0 - inside * rim * (1.0 - vis) * 0.5) * (1.0 - fa);
  float opacity = clamp(max(coverage, max(col.r, max(col.g, col.b))), 0.0, 1.0);
  gl_FragColor = vec4(clamp(col, 0.0, opacity), opacity);
}
`;

type Faisceau = { width?: number; twist?: number; thickness?: number; comb?: number };

type Props = {
  variante?: "arc" | "droit";
  couleurs?: string[];
  fond?: string;
  encre?: string;
  reflet?: string;
  lueur?: number;
  densite?: number;
  vitesse?: number;
  direction?: number;
  survol?: number;
  portee?: number;
  centreX?: number;
  centreY?: number;
  rayonX?: number;
  rayonY?: number;
  inclinaison?: number;
  faisceau?: Faisceau;
  style?: CSSProperties;
};

const borne = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const nombre = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);

function rvb(c: string | undefined, defaut: [number, number, number]): [number, number, number] {
  if (!c) return defaut;
  const s = String(c).trim();
  if (s.charAt(0) === "#") {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255];
    }
    return defaut;
  }
  const n = s.match(/[\d.]+/g);
  return n && n.length >= 3
    ? [Math.min(255, parseFloat(n[0])) / 255, Math.min(255, parseFloat(n[1])) / 255, Math.min(255, parseFloat(n[2])) / 255]
    : defaut;
}

function compiler(gl: WebGLRenderingContext, type: number, source: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
  console.error("RubanFibre, shader :", gl.getShaderInfoLog(sh));
  gl.deleteShader(sh);
  return null;
}

export default function RubanFibre({
  variante = "arc",
  couleurs,
  fond = "#EEEEEE",
  encre = "#000000",
  reflet = "#FFFFFF",
  lueur = 0,
  densite = 40,
  vitesse = 100,
  direction = 0,
  survol = 120,
  portee = 23,
  centreX = 46.1,
  centreY = 99.7,
  rayonX = 98.1,
  rayonY = 67.9,
  inclinaison = 37.9,
  faisceau,
  style,
}: Props) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  const f = { width: 26, twist: 100, thickness: 100, comb: 170, ...(faisceau || {}) };
  const palette = couleurs ?? (variante === "arc" ? BLEU : ORIGINE);

  /* Les réglages vivent dans une ref : la boucle de rendu les relit à chaque
     image, sans relancer le contexte WebGL quand une prop change. */
  const valeurs = {
    fond, encre, reflet, couleurs: palette.join("|"),
    lueur: borne(nombre(lueur, 0), 0, 150) / 100,
    densite: borne(nombre(densite, 40), 4, 40),
    vitesse: borne(nombre(vitesse, 50), 0, 100) / 50,
    direction: (borne(nombre(direction, 0), 0, 360) * Math.PI) / 180,
    survol: borne(nombre(survol, 100), 0, 200) / 100,
    portee: borne(nombre(portee, 30), 5, 100) / 100,
    centreX: nombre(centreX, 46.1) / 100,
    centreY: nombre(centreY, 99.7) / 100,
    rayonX: borne(nombre(rayonX, 98.1), 5, 400) / 100,
    rayonY: borne(nombre(rayonY, 67.9), 5, 400) / 100,
    inclinaison: (nombre(inclinaison, 37.9) * Math.PI) / 180,
    largeur: borne(nombre(f.width, 26), 2, 80) / 100,
    torsion: borne(nombre(f.twist, 100), 0, 300) / 100,
    epaisseur: borne(nombre(f.thickness, 100), 20, 400) / 100,
    peigne: borne(nombre(f.comb, 170), 0, 400) / 100,
  };
  const reglages = useRef(valeurs);
  useEffect(() => {
    reglages.current = valeurs;
  });
  const souris = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, cible: 0 });

  useEffect(() => {
    const c = toile.current;
    if (!c) return;
    const gl = c.getContext("webgl", {
      antialias: false, alpha: true, premultipliedAlpha: true, depth: false, preserveDrawingBuffer: false,
    });
    if (!gl) return;
    const vs = compiler(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compiler(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("RubanFibre, liaison :", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    const tampon = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const cache: Record<string, WebGLUniformLocation | null> = {};
    const u = (nom: string) => (nom in cache ? cache[nom] : (cache[nom] = gl.getUniformLocation(prog, nom)));

    const droit = variante === "droit";
    let image = 0;
    let avant = performance.now();
    let temps = 0;
    let visible = false;
    let detruit = false;
    let dernier = -Infinity;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
    const actif = () => !detruit && visible && !document.hidden && !gl.isContextLost();
    const planifier = () => {
      if (!image && actif()) image = requestAnimationFrame(rendre);
    };
    const rendre = (t: number) => {
      image = 0;
      if (!actif()) return;
      if (!droit && t - dernier < PAS_MS) return void planifier();
      dernier = t;
      const dt = Math.min(0.05, (t - avant) / 1000);
      avant = t;
      const s = reglages.current;
      temps = (temps + dt * s.vitesse) % 3600;
      const m = souris.current;
      const k = 1 - Math.exp(-6 * dt);
      m.on += (m.cible - m.on) * k;
      m.x += ((m.cible > 0 ? m.tx : 0.5) - m.x) * k;
      m.y += ((m.cible > 0 ? m.ty : 0.5) - m.y) * k;

      const l = c.clientWidth || 1200;
      const h = c.clientHeight || 800;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.5e6 / Math.max(1, l * h)));
      const L = Math.max(1, Math.round(l * ratio));
      const H = Math.max(1, Math.round(h * ratio));
      if (c.width !== L || c.height !== H) {
        c.width = L;
        c.height = H;
      }
      gl.viewport(0, 0, L, H);
      /* --fibre-extension : la hauteur (en px CSS) dont la toile déborde sous
         le cadre du héros ; l'anneau se compose sur la hauteur restante. */
      const rallonge = Math.max(0, parseFloat(getComputedStyle(c).getPropertyValue("--fibre-extension")) || 0) * ratio;
      const Hu = Math.max(1, H - rallonge);
      const aspect = L / Hu;
      gl.uniform2f(u("uRes"), L, Hu);
      gl.uniform1f(u("uStraight"), droit ? 1 : 0);
      gl.uniform1f(u("uPixelRatio"), ratio);
      gl.uniform1f(u("uBottomExtension"), rallonge);
      gl.uniform1f(u("uTime"), temps);
      gl.uniform2f(u("uMouse"), m.x, 1 - m.y);
      gl.uniform1f(u("uHover"), Math.min(1, m.on) * s.survol);
      const cf = rvb(s.fond, [0.933, 0.933, 0.933]);
      gl.uniform3f(u("uBg"), cf[0], cf[1], cf[2]);
      const cr = rvb(s.reflet, [1, 1, 1]);
      gl.uniform3f(u("uHigh"), cr[0], cr[1], cr[2]);
      const ce = rvb(s.encre, [0, 0, 0]);
      gl.uniform3f(u("uInk"), ce[0], ce[1], ce[2]);
      const liste = s.couleurs.split("|");
      const pal = new Float32Array(18);
      for (let i = 0; i < 6; i++) pal.set(rvb(liste[Math.min(i, liste.length - 1)], [1, 1, 1]), 3 * i);
      gl.uniform3fv(u("uPal"), pal);
      gl.uniform1f(u("uGlow"), s.lueur);
      gl.uniform2f(u("uCenter"), (s.centreX - 0.5) * aspect, 0.5 - s.centreY);
      const echelle = aspect >= 1 ? 1 : Math.min(1, (0.47 * aspect) / (s.rayonX + s.largeur / 2));
      gl.uniform2f(u("uRadii"), s.rayonX * echelle, s.rayonY * echelle);
      gl.uniform1f(u("uStrands"), s.densite);
      gl.uniform1f(u("uReach"), s.portee);
      gl.uniform1f(u("uDir"), s.direction);
      gl.uniform1f(u("uWidth"), s.largeur * echelle);
      gl.uniform1f(u("uTilt"), s.inclinaison);
      gl.uniform1f(u("uTwist"), s.torsion);
      gl.uniform1f(u("uThin"), s.epaisseur);
      gl.uniform1f(u("uComb"), s.peigne);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!droit && !calme.matches) planifier();
    };

    const bouge = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const dedans = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      souris.current.tx = borne(x, 0, 1);
      souris.current.ty = borne(y, 0, 1);
      souris.current.cible = dedans ? 1 : 0;
    };
    const quitte = () => {
      souris.current.cible = 0;
    };
    const relancer = () => {
      cancelAnimationFrame(image);
      image = 0;
      avant = performance.now();
      dernier = -Infinity;
      planifier();
    };
    const vue = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      relancer();
    });
    vue.observe(c);
    const taille = new ResizeObserver(relancer);
    taille.observe(c);
    document.addEventListener("visibilitychange", relancer);
    calme.addEventListener("change", relancer);
    if (!droit) {
      window.addEventListener("pointermove", bouge, { passive: true });
      document.addEventListener("pointerleave", quitte);
    }
    return () => {
      detruit = true;
      cancelAnimationFrame(image);
      vue.disconnect();
      taille.disconnect();
      document.removeEventListener("visibilitychange", relancer);
      calme.removeEventListener("change", relancer);
      window.removeEventListener("pointermove", bouge);
      document.removeEventListener("pointerleave", quitte);
      gl.deleteBuffer(tampon);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [variante]);

  return (
    <div style={{ position: "relative", overflow: "hidden", background: "transparent", width: "100%", height: "100%", ...style }}>
      <canvas
        ref={toile}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
