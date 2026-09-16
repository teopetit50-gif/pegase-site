"use client";

import * as React from "react";

/* ══════════════════════════════════════════════════════════════════════
   HalftoneFlow — une nappe de points animée, en WebGL.
   Repris de 21st.dev (16/09/2026) pour /offres/sur-mesure, à la place de
   la carte noire de la référence (scale.com/generative-ai-data-engine,
   § « Scale's Generative AI Data Engine combines… »).

   ── CE QUI A ÉTÉ JETÉ, ET POURQUOI ───────────────────────────────────
   L'original livre le shader dans une IFRAME `srcDoc` qui contient une
   page complète : Tailwind en CDN, Iconify, GSAP, ScrollTrigger, quatre
   avatars sur cdn.21st.dev, un hero « Nexus », un formulaire de liste
   d'attente et un pied de page — le tout masqué par un script d'isolement
   pour ne laisser voir que le canevas.

   Rien de cela ne pouvait entrer ici :
   • QUATRE SCRIPTS EXTERNES. Notre politique de contenu déclare
     `script-src 'self'` (next.config.ts). Elle est en mode rapport
     aujourd'hui, donc ils passeraient en produisant quatre violations ;
     le jour où on l'applique, le bloc devient un rectangle noir. On ne
     pose pas une bombe à retardement dans une page de vente.
   • LE POIDS. ~400 ko de scripts tiers et quatre images, pour un décor.
     Le site a un chantier rapidité ouvert ; un décor ne le paie pas.
   • LA FAUSSE PREUVE SOCIALE. « 5 102 early adopters » et quatre avatars
     de clients inventés voyagent dans le `srcDoc`, cachés mais présents
     dans le DOM. La règle du parc l'interdit, visible ou non.

   Ce qui est gardé est la seule chose intéressante : le shader. Il tourne
   ici sur un `<canvas>` ordinaire, sans iframe, sans CDN, sans réseau.

   ── CE QUI A ÉTÉ AJOUTÉ ──────────────────────────────────────────────
   • La palette est passée en UNIFORMES, donc réglable depuis la page
     sans toucher au shader. Les rouges d'origine sont remplacés par le
     vert de la citation : le bloc appartient à la page.
   • `prefers-reduced-motion` : une seule image, pas de boucle.
   • La boucle s'arrête hors écran (IntersectionObserver) et sur onglet
     caché. Un shader qui tourne dans le vide chauffe une machine pour
     rien.
   • La densité des points suit la densité d'écran : sans ça, la trame
     est deux fois plus fine sur un écran Retina que sur un autre.

   ⚠ NE PAS appeler `loseContext()` au démontage. Un canevas WebGL dont
   le contexte a été perdu reste bloqué à 300 × 150 au remontage, sans une
   erreur — piège déjà payé sur l'accueil.
   ══════════════════════════════════════════════════════════════════════ */

export type HalftoneFlowProps = {
  /** Couleur du creux, en RVB 0→1. */
  fond?: [number, number, number];
  /** Couleur de la nappe. */
  nappe?: [number, number, number];
  /** Couleur des crêtes. */
  crete?: [number, number, number];
  /** Côté d'une cellule de trame, en pixels CSS. */
  trame?: number;
  /** Vitesse de l'écoulement. 1 = la vitesse d'origine. */
  vitesse?: number;
  className?: string;
};

const VERTEX = `
attribute vec4 aVertexPosition;
void main() { gl_Position = aVertexPosition; }
`;

/* Le shader de l'original, à deux choses près : les trois couleurs et le
   pas de trame sont des uniformes au lieu d'être écrits en dur. */
const FRAGMENT = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_grid;
uniform vec3 u_dark;
uniform vec3 u_mid;
uniform vec3 u_bright;

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  vec2 flow_uv = p;
  float time = u_time * 0.4;

  for (float i = 1.0; i < 4.0; i++) {
    flow_uv *= rot(time * 0.1);
    flow_uv.x += sin(flow_uv.y * 2.0 * i + time) * 0.5;
    flow_uv.y += cos(flow_uv.x * 1.5 * i - time * 0.8) * 0.5;
  }

  float intensity = sin(flow_uv.x * 2.0 + flow_uv.y * 3.0) * 0.5 + 0.5;

  vec3 fluid = mix(u_dark, u_mid, smoothstep(0.2, 0.6, intensity));
  fluid = mix(fluid, u_bright, smoothstep(0.7, 1.0, intensity));

  vec2 grid_uv = gl_FragCoord.xy / u_grid;
  vec2 cell_uv = fract(grid_uv) - 0.5;

  float dist = length(cell_uv);
  float radius = intensity * 0.45;
  float dot_mask = smoothstep(radius, radius - 0.1, dist);

  vec3 final_color = mix(vec3(0.0), fluid, dot_mask);
  final_color += fluid * 0.15;

  gl_FragColor = vec4(final_color, 1.0);
}
`;

function compiler(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HalftoneFlow({
  fond = [0.0, 0.016, 0.012],
  nappe = [0.098, 0.325, 0.196],
  crete = [0.184, 0.902, 0.659],
  trame = 6,
  vitesse = 1,
  className,
}: HalftoneFlowProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  /* Les réglages passent par un ref : la boucle les lit sans être
     relancée quand une prop bouge. */
  const reglages = React.useRef({ fond, nappe, crete, trame, vitesse });
  React.useEffect(() => {
    reglages.current = { fond, nappe, crete, trame, vitesse };
  });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    /* Pas de WebGL (machine ancienne, contexte refusé) : on laisse le noir
       du cadre. Le bloc est un décor, il ne doit jamais casser la page. */
    if (!gl) return;

    const vs = compiler(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compiler(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uGrid = gl.getUniformLocation(program, "u_grid");
    const uDark = gl.getUniformLocation(program, "u_dark");
    const uMid = gl.getUniformLocation(program, "u_mid");
    const uBright = gl.getUniformLocation(program, "u_bright");

    /* Le pas de trame est en pixels CSS mais `gl_FragCoord` est en pixels
       physiques : sans cette multiplication, la trame est deux fois plus
       fine sur un écran à densité double. */
    let densite = 1;
    const dimensionner = () => {
      densite = Math.min(window.devicePixelRatio || 1, 2);
      const l = Math.max(1, Math.round(canvas.clientWidth * densite));
      const h = Math.max(1, Math.round(canvas.clientHeight * densite));
      if (canvas.width !== l || canvas.height !== h) {
        canvas.width = l;
        canvas.height = h;
        gl.viewport(0, 0, l, h);
      }
    };

    const peindre = (secondes: number) => {
      const r = reglages.current;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, secondes);
      gl.uniform1f(uGrid, r.trame * densite);
      gl.uniform3fv(uDark, r.fond);
      gl.uniform3fv(uMid, r.nappe);
      gl.uniform3fv(uBright, r.crete);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const depart = performance.now();
    let raf = 0;
    let visible = true;

    const image = (now: number) => {
      raf = 0;
      dimensionner();
      peindre(((now - depart) / 1000) * reglages.current.vitesse);
      if (visible && !media.matches && !document.hidden) raf = requestAnimationFrame(image);
    };
    const lancer = () => {
      if (raf) return;
      if (media.matches) {
        /* Mouvement réduit : une image fixe, prise à un instant où la
           nappe est déjà formée — un écran noir ne dirait rien. */
        dimensionner();
        peindre(8);
        return;
      }
      raf = requestAnimationFrame(image);
    };
    const arreter = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e?.isIntersecting ?? true;
        if (visible) lancer();
        else arreter();
      },
      { threshold: 0 }
    );
    io.observe(canvas);
    const onVisibilite = () => (document.hidden ? arreter() : lancer());
    const ro = new ResizeObserver(() => {
      if (!raf) lancer();
    });
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibilite);
    media.addEventListener("change", lancer);
    lancer();

    return () => {
      arreter();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibilite);
      media.removeEventListener("change", lancer);
      /* Volontairement PAS de `getExtension('WEBGL_lose_context').loseContext()` :
         il fige le canevas à 300 × 150 au remontage. */
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}

export default HalftoneFlow;
