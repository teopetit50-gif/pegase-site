"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   LE VERRE DU HÉROS — /secteurs/groupes (v3, 25/09/2026)

   La référence (payload-marketing-v1.21st.app) pose derrière son héros
   une vidéo de 60 s, `glass-animation.mp4` : des rubans de verre flous,
   en diagonale à 40°, bleu nuit à arêtes nettes, avec de rares reflets
   dorés, montrés à 32 % en `mix-blend-mode: screen` sur un fond presque
   noir. Le fichier est le leur : il n'est pas repris. Le même dessin est
   peint ici en WebGL, pour un fond BLANC : les rubans foncent le blanc au
   lieu d'éclaircir le noir, et le parent les pose à 32 % en `multiply`
   (l'inverse exact de `screen`). Décomposée image par image le 25/09
   (huit vues sur les 60 s), leur vidéo donne le cahier des charges :
   onze rubans environ, larges de 3 à 15 % de la hauteur, discontinus
   (des plages qui glissent le long du ruban), un filet net sur un bord.

   Le socle est celui de components/accueil/FondSilk.tsx (même page, même
   budget, mêmes règles) : un triangle plein écran en WebGL1, sans
   librairie ; la toile cadrée sur son CONTENEUR (ResizeObserver) ; la
   boucle coupée onglet caché et héros hors de l'écran, l'horloge ne
   courant que pendant le temps vu ; aucune lecture de mise en page dans
   la boucle ; `prefers-reduced-motion` : rien (la feuille masque la
   toile, comme la référence masque sa vidéo).

   La densité est plafonnée à 1 et bornée par un budget de pixels : ce
   sont des flous, sans contour à rendre net, vus à 32 %.
   ══════════════════════════════════════════════════════════════════════ */

const SOMMET = `attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_t;

float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

float bruit(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(h1(i), h1(i + 1.0), u);
}

/* deux octaves : des plages longues, et du grain dans la plage */
float plage(float x) {
  return 0.68 * bruit(x) + 0.32 * bruit(x * 2.3 + 7.1);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  /* les rubans montent vers la droite, à 40 degrés */
  const float A = 0.6981;
  float u = p.x * sin(A) - p.y * cos(A);
  float v = p.x * cos(A) + p.y * sin(A);
  float t = u_t;

  float encre = 0.0;
  float dore = 0.0;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float s1 = h1(fi * 1.71 + 0.3);
    float s2 = h1(fi * 3.13 + 1.9);
    float s3 = h1(fi * 5.37 + 4.2);
    /* position en travers : répartie, puis un lent balancement */
    float centre = -1.05 + fi * 0.205 + (s1 - 0.5) * 0.12
      + 0.07 * sin(t * (0.1 + 0.08 * s2) + s3 * 6.2831);
    float largeur = 0.035 + 0.11 * s2;
    float d = (u - centre) / largeur;
    /* le corps flou du ruban, plus dense vers son bord */
    float corps = exp(-d * d * 1.2) * (0.55 + 0.45 * smoothstep(-1.0, 1.0, d));
    /* l'arête : un filet net sur ce bord */
    float arete = exp(-pow((d - 1.05) * 5.5, 2.0));
    /* le ruban n'est pas continu : des plages qui glissent le long */
    float m = smoothstep(0.38, 0.78,
      plage(v * (1.1 + 0.9 * s3) + fi * 13.7 - t * (0.07 + 0.06 * s1)));
    float force = 0.45 + 0.55 * s1;
    encre += (corps * 0.85 + arete * 0.6) * m * force;
    /* un ruban sur trois porte des reflets dorés, rares */
    if (s3 > 0.66) {
      float mo = smoothstep(0.62, 0.9,
        plage(v * 0.8 + fi * 3.1 - t * 0.06 + 40.0));
      dore += corps * mo * 0.9;
    }
  }
  encre = clamp(encre, 0.0, 1.0);
  dore = clamp(dore, 0.0, 1.0);

  vec3 bleu = vec3(0.46, 0.56, 0.72);
  vec3 or_ = vec3(0.97, 0.80, 0.50);
  vec3 col = mix(vec3(1.0), bleu, encre);
  col *= mix(vec3(1.0), or_, dore);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Pixels physiques peints par image, au plus. Un héros de 1440 × 975
   tient à la densité 0,86 ; un téléphone à la densité 1. */
const BUDGET_PIXELS = 1_200_000;

function compiler(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Verre — compilation :", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export default function Verre() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const toile = ref.current;
    if (!toile) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* `alpha: false` : le shader rend une couleur opaque, et c'est le
       parent (opacité 0,32, `multiply`) qui la fond dans le blanc. */
    const gl = toile.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;
    /* Pas de WebGL : le héros reste blanc, rien d'autre ne change. */
    if (!gl) return;

    const vs = compiler(gl, gl.VERTEX_SHADER, SOMMET);
    const fs = compiler(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Verre — édition de liens :", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    /* Un triangle plein écran : aucune arête ne traverse l'image. */
    const tampon = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uT = gl.getUniformLocation(prog, "u_t");

    let largeur = 0;
    let hauteur = 0;
    const dimensionner = () => {
      const cadre = toile.parentElement ?? toile;
      const cl = Math.max(1, cadre.clientWidth);
      const ch = Math.max(1, cadre.clientHeight);
      const densite = Math.max(
        0.5,
        Math.min(window.devicePixelRatio || 1, 1, Math.sqrt(BUDGET_PIXELS / (cl * ch))),
      );
      const l = Math.round(cl * densite);
      const h = Math.round(ch * densite);
      if (l === largeur && h === hauteur) return false;
      largeur = l;
      hauteur = h;
      toile.width = l;
      toile.height = h;
      gl.viewport(0, 0, l, h);
      return true;
    };

    const peindre = (t: number) => {
      gl.uniform2f(uRes, largeur, hauteur);
      gl.uniform1f(uT, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let raf = 0;
    let horloge = 0; // secondes VUES écoulées
    let dernier = performance.now();
    let enVue = true;

    const boucle = () => {
      if (gl.isContextLost()) {
        raf = 0;
        return;
      }
      const maintenant = performance.now();
      horloge += (maintenant - dernier) / 1000;
      dernier = maintenant;
      peindre(horloge);
      raf = requestAnimationFrame(boucle);
    };

    const accorder = () => {
      const doitTourner = !document.hidden && enVue;
      if (!doitTourner && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (doitTourner && !raf) {
        dernier = performance.now();
        raf = requestAnimationFrame(boucle);
      }
    };

    dimensionner();
    peindre(0);
    accorder();

    const ro = new ResizeObserver(() => {
      if (dimensionner() && !raf) peindre(horloge);
    });
    ro.observe(toile.parentElement ?? toile);

    const io = new IntersectionObserver(
      ([entree]) => {
        enVue = entree.isIntersecting;
        accorder();
      },
      { threshold: 0 },
    );
    io.observe(toile.parentElement ?? toile);

    document.addEventListener("visibilitychange", accorder);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", accorder);
      /* Pas de loseContext() : il casse le remontage (la toile reste à
         300 × 150 au retour sur la page). Le contexte part avec la toile. */
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
