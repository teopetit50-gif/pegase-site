"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   FOND « SILK » — nuancier animé en WebGL, posé derrière le hero clair.

   11/09/2026 (Teo) — remplace l'image `/fonds/plis-blancs.webp` du
   template Flux. La recette (couleurs, vitesse, zoom, intensité, warp,
   contraste, vignette, graine) vient du Shader Builder de 21st.dev ;
   le fragment ci-dessous est repris MOT POUR MOT de ce qu'il produit,
   y compris ses commentaires. Ne pas le « nettoyer » : ses garde-fous de
   précision (le mod 31 en mediump, le max() avant pow) sont ce qui
   l'empêche de rendre du bruit sur les machines sans highp.

   Ce qui est à nous, et seulement ça :
   · le socle WebGL1 sans librairie — un triangle plein écran, pas de
     quad : trois sommets au lieu de six, et aucune couture diagonale ;
   · le cadrage sur le CONTENEUR (ResizeObserver), pas sur la fenêtre —
     le fond vit dans `.o-flux-fond`, qui est en `inset: 0` de la
     section, pas dans `100vh` ;
   · la densité plafonnée à 2 : au-delà on peint quatre fois plus de
     pixels pour un dégradé que personne ne peut voir plus net ;
   · la boucle coupée quand l'onglet passe en arrière-plan, et
     l'horloge qui n'avance QUE pendant le temps visible — sinon le
     nuancier saute d'un coup au retour d'onglet, après vingt minutes
     ailleurs ;
   · `prefers-reduced-motion` : une image peinte une fois, immobile.
     Même parti que `woven-light-hero`.

   Le curseur est désactivé dans la recette : `u_cursor.x` (la présence)
   reste à 0, donc aucun écouteur de souris n'est posé. C'est voulu —
   un écouteur `mousemove` sur la page d'accueil pour un effet qu'on
   n'affiche pas serait payé pour rien.
   ══════════════════════════════════════════════════════════════════════ */

const SOMMET = `attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT = `// "Silk" — made with the 21st.dev Shader Builder
// Packed WebGL1 uniforms (the shader exposes readable u_* aliases as macros):
//   u_colors[8] (first 4 used)
//   vec3(0.063, 0.063, 0.063)
//   vec3(0.961, 0.961, 0.961)
//   vec3(0.690, 0.690, 0.690)
//   vec3(0.227, 0.227, 0.227)
//   u_scene = vec4(canvas width, canvas height, seconds * 0.18, 4.0)
//   u_shape = vec4(1.38, 0.43, 0.80, 0.02)
//   u_surface = vec4(1.57, 0.96, 0.00, 1.00)
//   u_finish = vec4(0.00, 0.28, 0.002, 0.00)
//   u_transform = vec4(5293.0, 5.25, 0.01, 0.0)
//   u_space = vec4(0.08, -0.07, pointer x, pointer y)
//   u_cursor = vec4(presence, 2.0, 0.65, 0.46)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
// Seven packed vectors + eight colour vectors = 15 fragment uniform vectors,
// one below WebGL1's guaranteed minimum. Macros preserve the public u_* API.
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle
uniform vec4 u_space;      // offset.xy, pointer.xy
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
// Keep hash inputs inside mediump's guaranteed ±2^14 range.
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Even, un-structured white noise for film grain (Dave Hoskins hash12). The
// multiply hash above is fine for value noise but shows a faint axis-aligned
// mesh at integer fragment coords, which reads as a net over flat areas.
float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  float n = sin(dot(p, vec2(41.0, 289.0)));
  return fract(vec2(15731.743, 7892.321) * n);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

// --- OKLab colour mixing (perceptual), gated by u_oklab -----------------------
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  // max() guards the sRGB branch: out-of-gamut OKLab interpolations can send a
  // channel negative, and pow(negative, …) is NaN which mix()/step() would
  // then propagate. The linear branch clips such channels to 0 downstream.
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

// Mix through the recipe colours; x is clamped to 0..1. WebGL1 forbids
// dynamic uniform indexing in fragment shaders, hence the constant loop.
vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,
                          0.587, -0.274, -0.523,
                          0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0,
                          0.956, -0.272, -1.106,
                          0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  vec2 q = p * 1.6;
  float amp = 0.25 + u_intensity * 0.85;
  for (float i = 1.0; i < 5.0; i += 1.0) {
    q.x += amp / i * cos(i * 2.4 * q.y + t * 0.8 + u_seed);
    q.y += amp / i * cos(i * 1.7 * q.x + t * 0.6);
  }
  return palette(0.5 + 0.5 * sin(q.x + q.y));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;

  // Cursor modes 1–3 are local distortions. Push shifts the same screen-space
  // coordinates before field transforms, so Zoom/Rotate don't change its feel.
  if (u_cursorPresence > 0.001) {
    // u_mouse is normalized to -1..1 in canvas space. Convert it to the same
    // aspect-corrected screen space as p so effects stay under the cursor.
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)
      / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence
        * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(
          cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }

  // Keep presets that read uv (rather than p) in the same warped space.
  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  // Field transform: rotate, pan, pointer push, slow drift.
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  // Organic domain warp.
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }
  // Shade, with an optional soft 5-tap blur.
  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }
  // Post: contrast, saturation, hue, brightness, vignette, grain.
  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)
    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/* La recette, telle que la donne l'en-tête du shader. Les quatre couleurs
   #101010 / #F5F5F5 / #B0B0B0 / #3A3A3A sont écrites en 0–1 ; les quatre
   emplacements restants de `u_colors[8]` ne sont jamais lus (le compte est
   à 4) mais doivent être posés, un uniforme de tableau non initialisé ne
   vaut pas zéro sur tous les pilotes. */
const COULEURS = new Float32Array([
  0.063, 0.063, 0.063,
  0.961, 0.961, 0.961,
  0.69, 0.69, 0.69,
  0.227, 0.227, 0.227,
  0.227, 0.227, 0.227,
  0.227, 0.227, 0.227,
  0.227, 0.227, 0.227,
  0.227, 0.227, 0.227,
]);

const NB_COULEURS = 4;
const VITESSE = 0.18; // u_scene.z = secondes × 0.18
const U_SHAPE = [1.38, 0.43, 0.8, 0.02]; // zoom, intensité, paramA, warp
const U_SURFACE = [1.57, 0.96, 0.0, 1.0]; // détail, contraste, luminosité, saturation
const U_FINISH = [0.0, 0.28, 0.002, 0.0]; // teinte, vignette, flou, grain
const U_TRANSFORM = [5293.0, 5.25, 0.01, 0.0]; // graine, rotation, dérive, OKLab
const U_SPACE = [0.08, -0.07, 0.0, 0.0]; // décalage x/y, pointeur x/y (curseur éteint)
const U_CURSOR = [0.0, 2.0, 0.65, 0.46]; // présence 0 = curseur éteint

function compiler(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("FondSilk — compilation :", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export default function FondSilk({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const toile = ref.current;
    if (!toile) return;

    /* `alpha: false` : le shader rend toujours une couleur opaque, et c'est
       le masque radial de `.o-flux-fond` qui fond les bords. Un canevas
       transparent ferait composer le navigateur pour rien. */
    const gl = toile.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;
    /* Pas de WebGL (vieux pilote, accélération coupée) : on ne fait rien.
       La section garde son #f6f6f6 et le hero reste lisible. */
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
      console.error("FondSilk — édition de liens :", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    /* Un TRIANGLE plein écran, pas deux : le triangle déborde du cadre
       (−1..3), donc aucune arête ne traverse l'image et le pixel de la
       diagonale n'est pas rasterisé deux fois. */
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

    const loc = (nom: string) => gl.getUniformLocation(prog, nom);
    const uColors = loc("u_colors[0]");
    const uScene = loc("u_scene");
    const uShape = loc("u_shape");
    const uSurface = loc("u_surface");
    const uFinish = loc("u_finish");
    const uTransform = loc("u_transform");
    const uSpace = loc("u_space");
    const uCursor = loc("u_cursor");

    gl.uniform3fv(uColors, COULEURS);
    gl.uniform4f(uShape, U_SHAPE[0], U_SHAPE[1], U_SHAPE[2], U_SHAPE[3]);
    gl.uniform4f(uSurface, U_SURFACE[0], U_SURFACE[1], U_SURFACE[2], U_SURFACE[3]);
    gl.uniform4f(uFinish, U_FINISH[0], U_FINISH[1], U_FINISH[2], U_FINISH[3]);
    gl.uniform4f(
      uTransform,
      U_TRANSFORM[0],
      U_TRANSFORM[1],
      U_TRANSFORM[2],
      U_TRANSFORM[3],
    );
    gl.uniform4f(uSpace, U_SPACE[0], U_SPACE[1], U_SPACE[2], U_SPACE[3]);
    gl.uniform4f(uCursor, U_CURSOR[0], U_CURSOR[1], U_CURSOR[2], U_CURSOR[3]);

    let largeur = 0;
    let hauteur = 0;

    const dimensionner = () => {
      const cadre = toile.parentElement ?? toile;
      const densite = Math.min(window.devicePixelRatio || 1, 2);
      const l = Math.max(1, Math.round(cadre.clientWidth * densite));
      const h = Math.max(1, Math.round(cadre.clientHeight * densite));
      if (l === largeur && h === hauteur) return false;
      largeur = l;
      hauteur = h;
      toile.width = l;
      toile.height = h;
      gl.viewport(0, 0, l, h);
      return true;
    };

    const peindre = (t: number) => {
      gl.uniform4f(uScene, largeur, hauteur, t * VITESSE, NB_COULEURS);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const doux = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let horloge = 0; // secondes VISIBLES écoulées
    let dernier = performance.now();

    const boucle = () => {
      if (gl.isContextLost()) {
        raf = 0;
        return;
      }
      const maintenant = performance.now();
      horloge += (maintenant - dernier) / 1000;
      dernier = maintenant;
      dimensionner();
      peindre(horloge);
      raf = requestAnimationFrame(boucle);
    };

    const visibilite = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !doux) {
        /* On repart de l'instant présent : l'horloge n'a pas couru pendant
           que l'onglet était derrière, donc le nuancier reprend là où il
           s'était arrêté au lieu de sauter. */
        dernier = performance.now();
        raf = requestAnimationFrame(boucle);
      }
    };

    dimensionner();
    if (doux) {
      peindre(0);
    } else if (!document.hidden) {
      raf = requestAnimationFrame(boucle);
    }

    const ro = new ResizeObserver(() => {
      if (dimensionner() && (doux || !raf)) peindre(horloge);
    });
    ro.observe(toile.parentElement ?? toile);
    document.addEventListener("visibilitychange", visibilite);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", visibilite);
      gl.deleteBuffer(tampon);
      gl.deleteProgram(prog);
      /* PAS de `WEBGL_lose_context.loseContext()` ici, même si c'est ce
         qu'on lit partout pour « libérer le GPU au démontage ». React
         monte, démonte puis remonte chaque effet en mode strict (le
         développement de Next), et il REMONTE SUR LE MÊME <canvas> : le
         contexte perdu au premier nettoyage est celui que le second
         montage récupère. `createShader` rend alors `null` sans lever
         d'erreur, la boucle ne démarre jamais, et le canevas reste à sa
         taille par défaut de 300 × 150 — relevé le 11/09 à 768 et 1024,
         où le fond avait purement disparu. Le contexte part avec
         l'élément quand il quitte le DOM ; il n'y a rien à forcer. */
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
