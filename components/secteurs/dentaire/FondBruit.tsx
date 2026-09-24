"use client";
/* ══════════════════════════════════════════════════════════════════════
   FondBruit — le fond WebGL de l'appel final (`C_pe` de la source ; il
   était aussi derrière le héros, où la photo du cabinet l'a remplacé le
   24/09) : un bruit fractal (fbm) déformé, en aplats vert d'eau à bord
   net, grainé, plein en haut et fondu vers le bas. three.js nu, sans
   @react-three/fiber, comme la source.

   La source lisait un thème (`useTheme`) figé sur « clair » : seules les
   couleurs claires sont reprises, posées dès la création au lieu d'un
   second effet. Rhabillage du 24/09 : le bleu ciel (a #0ea5e9, b #f0f9ff,
   c #bae6fd) devient le vert d'eau pâle (a #72b0a4, b #f3f8f7, c #c7e1db).

   Économie, recopiée : densité plafonnée à 1,25, rendu arrêté hors de la
   fenêtre (IntersectionObserver, marge 200 px), temps figé si l'OS
   demande moins d'animations, perte de contexte gérée. Pas de
   `loseContext()` au démontage (voir la mémoire du même nom : il casse le
   remontage) — `dispose()` seulement, comme la source.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import * as THREE from "three";

const SOMMETS = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAGMENTS = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uAspect, uDark;
uniform vec2 uMouse;
uniform vec3 uA, uB, uC;

vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
  return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(dot(h2(i+vec2(0,0)), f-vec2(0,0)), dot(h2(i+vec2(1,0)), f-vec2(1,0)), u.x),
             mix(dot(h2(i+vec2(0,1)), f-vec2(0,1)), dot(h2(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; } return v; }

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  float t = uTime * 0.028;

  vec2 warp = vec2(fbm(p*0.8 + vec2(t, -t*0.5)), fbm(p*0.8 + vec2(-t*0.6, t*0.75)));
  float f = fbm(p*1.05 + warp*1.15 + uMouse*0.18);
  float g = fbm(p*0.62 - warp*0.75 + vec2(t*0.4, t*0.22));

  // échantillons en miroir : des plages de lumière des DEUX côtés
  vec2 q = vec2(-p.x, p.y);
  float f2 = fbm(q*1.05 + warp*1.15 + vec2(4.3, -2.7) - uMouse*0.18);
  float g2 = fbm(q*0.62 - warp*0.75 + vec2(-5.1 + t*0.34, 3.6 + t*0.2));

  // smoothsteps raides : des aplats à bord net plutôt qu'un dégradé mou
  float m1 = max(smoothstep(0.02, 0.30, f), smoothstep(0.02, 0.30, f2));
  float m2 = max(smoothstep(0.05, 0.34, g), smoothstep(0.05, 0.34, g2));

  vec3 col = mix(uB, uA, m1);
  col = mix(col, uC, m2 * 0.55);
  col *= max(m1, m2 * 0.8);

  // grain grossier, plus fort dans les demi-teintes
  float n = fract(sin(dot(floor(uv*vec2(1600.0, 900.0)), vec2(12.9898,78.233)))*43758.5453);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += (n - 0.5) * (0.34 * (1.0 - abs(lum*2.0 - 1.0)));

  // plein en haut, fondu vers le bas
  float body = smoothstep(0.02, 0.42, uv.y);
  float a = clamp(max(m1, m2) * body * (0.55 + 0.45*uDark) + (n - 0.5) * 0.06 * body, 0.0, 1.0);

  gl_FragColor = vec4(max(col, vec3(0.0)), a);
}
`;

/* `u7()` de la source : les composantes hex / 255 posées telles quelles
   (`Color.set(r, g, b)`), SANS conversion sRGB → linéaire — ce que ferait
   `new THREE.Color("#…")`, qui éclaircirait les aplats. */
function couleurBrute(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, THREE.LinearSRGBColorSpace);
}

export default function FondBruit() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    let rendu: THREE.WebGLRenderer;
    try {
      rendu = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      return;
    }
    rendu.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const uniforms = {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uDark: { value: 0 },
      uA: { value: couleurBrute("#72b0a4") },
      uB: { value: couleurBrute("#f3f8f7") },
      uC: { value: couleurBrute("#c7e1db") },
    };

    const matiere = new THREE.ShaderMaterial({
      vertexShader: SOMMETS,
      fragmentShader: FRAGMENTS,
      uniforms,
      transparent: true,
    });
    const plan = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(plan, matiere));

    let attente: ReturnType<typeof setTimeout> | undefined;
    const retailler = () => {
      const { width, height } = parent.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      rendu.setSize(width, height, false);
      uniforms.uAspect.value = width / height;
    };
    retailler();
    const observateurTaille = new ResizeObserver(() => {
      clearTimeout(attente);
      attente = setTimeout(retailler, 120);
    });
    observateurTaille.observe(parent);

    const fige = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let image = 0;
    let enMarche = false;
    let contextePerdu = false;
    const boucle = () => {
      if (!enMarche) return;
      if (!fige) uniforms.uTime.value += 0.027;
      rendu.render(scene, camera);
      image = requestAnimationFrame(boucle);
    };
    const demarrer = () => {
      if (enMarche || contextePerdu) return;
      enMarche = true;
      image = requestAnimationFrame(boucle);
    };
    const arreter = () => {
      enMarche = false;
      cancelAnimationFrame(image);
    };
    const observateurVue = new IntersectionObserver(
      (entrees) => (entrees[0]?.isIntersecting ? demarrer() : arreter()),
      { rootMargin: "200px" },
    );
    observateurVue.observe(parent);

    const surPerte = (e: Event) => {
      e.preventDefault();
      contextePerdu = true;
      arreter();
    };
    const surRetour = () => {
      contextePerdu = false;
      retailler();
      demarrer();
    };
    canvas.addEventListener("webglcontextlost", surPerte);
    canvas.addEventListener("webglcontextrestored", surRetour);

    return () => {
      arreter();
      clearTimeout(attente);
      observateurVue.disconnect();
      observateurTaille.disconnect();
      canvas.removeEventListener("webglcontextlost", surPerte);
      canvas.removeEventListener("webglcontextrestored", surRetour);
      plan.dispose();
      matiere.dispose();
      rendu.dispose();
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
