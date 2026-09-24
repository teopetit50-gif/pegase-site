"use client";
/* ══════════════════════════════════════════════════════════════════════
   VagueDePoints — la nappe de points qui ondule derrière la section
   « Écrans » (`C_mU` de la source, composant « dot wave » de 21st.dev) :
   110 × 60 points, vus de biais par une caméra perspective, poussés par
   des sinus. Vert d'eau #4f9587 à 30 % (violet dans la référence, bleu
   ciel #0284c7 à 35 % dans la source jusqu'au rhabillage du 24/09). Même économie que FondBruit.tsx : densité ≤ 1,25, rendu
   arrêté hors de la fenêtre, temps figé si l'OS le demande.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import * as THREE from "three";

const SOMMETS = `
  attribute float scale;
  uniform float uTime;
  void main() {
    vec3 p = position;
    float s = scale;
    p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
    p.x += (sin(p.y + uTime) * 0.5);
    s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = s * 12.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENTS = `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    gl_FragColor = vec4(uColor, uOpacity);
  }
`;

const COLONNES = 110;
const RANGEES = 60;

export default function VagueDePoints({ className = "" }: { className?: string }) {
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

    const camera = new THREE.PerspectiveCamera(75, 1, 0.01, 1000);
    camera.position.set(0, 6, 5.5);
    camera.lookAt(0, 0, 0);
    const scene = new THREE.Scene();

    const positions = new Float32Array(COLONNES * RANGEES * 3);
    const tailles = new Float32Array(COLONNES * RANGEES);
    let i = 0;
    let j = 0;
    for (let x = 0; x < COLONNES; x++) {
      for (let z = 0; z < RANGEES; z++) {
        positions[i] = 0.32 * x - 17.6;
        positions[i + 1] = 0;
        positions[i + 2] = 0.32 * z - 9.6;
        tailles[j] = 1;
        i += 3;
        j++;
      }
    }
    const geometrie = new THREE.BufferGeometry();
    geometrie.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometrie.setAttribute("scale", new THREE.BufferAttribute(tailles, 1));
    const matiere = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: SOMMETS,
      fragmentShader: FRAGMENTS,
      uniforms: {
        uTime: { value: 0 },
        /* composantes brutes, comme `new Color(r, g, b)` dans la source */
        uColor: { value: new THREE.Color(0.31, 0.584, 0.529) },
        uOpacity: { value: 0.3 },
      },
    });
    const points = new THREE.Points(geometrie, matiere);
    scene.add(points);

    let attente: ReturnType<typeof setTimeout> | undefined;
    const retailler = () => {
      const l = parent.clientWidth;
      const h = parent.clientHeight;
      if (l === 0 || h === 0) return;
      rendu.setSize(l, h, false);
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
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
      if (!fige) matiere.uniforms.uTime.value += 0.012;
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
      scene.remove(points);
      geometrie.dispose();
      matiere.dispose();
      rendu.dispose();
    };
  }, []);

  return (
    <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
  );
}
