"use client";

/* Totems 3D des trois familles de moteurs — pièce d'or (défensifs), pointe de
   flèche (offensifs), gemme obsidienne (pépites). UN SEUL contexte WebGL
   partagé pour les trois via drei <View> : chaque slot DOM est scissor-rendu
   par le canvas fixe plein écran (pointer-events none). L'éclat vient des
   matériaux et de l'environnement studio (Lightformers procéduraux, aucun
   asset externe), pas d'un post-processing.

   Mouvement : rotation continue ~10 s/tour + respiration sur X, parallaxe
   souris amortie (desktop), boost bref à la vélocité de scroll, entrée
   scale+rotation à la première apparition. prefers-reduced-motion : une seule
   frame posée sur un bel angle (frameloop demand). */

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  View,
  PerspectiveCamera,
  Environment,
  Lightformer,
  ContactShadows,
} from "@react-three/drei";

export type TotemKind = "coin" | "arrow";

/* ——— store module partagé (souris, scroll, visibilité, media) ——— */
const store = {
  px: 0, // pointeur normalisé -1..1
  py: 0,
  boost: 0, // vélocité de scroll amortie
  visible: 0, // nombre de slots dans le viewport
  reduced: false,
  coarse: false,
  subs: new Set<() => void>(),
  bump() {
    this.subs.forEach((f) => f());
  },
};

const damp = (cur: number, target: number, lambda: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt));

/* ——— matériaux partagés ——— */
const GOLD = "#e0b341";

function useGoldMat(flat = false) {
  return useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: GOLD,
      metalness: 1,
      roughness: 0.24,
      envMapIntensity: 1.5,
      flatShading: flat,
    });
    return m;
  }, [flat]);
}

/* ——— géométries ——— */

function Coin() {
  const gold = useGoldMat();
  const goldFlat = useGoldMat(true);
  const relief = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: GOLD,
        metalness: 1,
        roughness: 0.18,
        envMapIntensity: 1.8,
      }),
    []
  );
  // géométries hoistées (les hooks ne vivent jamais dans un .map)
  const g = useMemo(() => {
    // frappe « $ » procédurale : deux arcs de tore (le S, ouvertures
    // opposées) + barre verticale — le $ a une symétrie de rotation à 180°,
    // donc la copie retournée pour la face arrière reste un $ lisible.
    // ATTENTION mapping : rotateX(π/2) fait worldY = −localZ et inverse le
    // sens angulaire (θ_monde = −θ_géométrie) — angles compensés ici, sinon
    // le S rend Ƨ (bug corrigé 20/07)
    const arcTop = new THREE.TorusGeometry(0.25, 0.055, 12, 48, 3.95);
    arcTop.rotateZ(2.13); // ouverture visée : bas-droite monde
    arcTop.rotateX(Math.PI / 2);
    arcTop.translate(0, 0.105, -0.225);
    const arcBot = new THREE.TorusGeometry(0.25, 0.055, 12, 48, 3.95);
    arcBot.rotateZ(-1.01); // ouverture visée : haut-gauche monde
    arcBot.rotateX(Math.PI / 2);
    arcBot.translate(0, 0.105, 0.225);
    return {
      body: new THREE.CylinderGeometry(0.96, 0.96, 0.18, 72),
      knurl: new THREE.CylinderGeometry(1.0, 1.0, 0.15, 72, 1, true),
      bevel: new THREE.TorusGeometry(0.965, 0.028, 12, 72),
      ring: new THREE.TorusGeometry(0.74, 0.014, 8, 64),
      arcTop,
      arcBot,
      // jonc rond, même rayon que le tube des arcs : un box plat reflétait
      // exactement comme la face et disparaissait — le cylindre accroche la
      // lumière comme les arcs
      bar: (() => {
        const b = new THREE.CylinderGeometry(0.052, 0.052, 1.15, 24);
        b.rotateX(Math.PI / 2);
        return b;
      })(),
    };
  }, []);
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={g.body} material={gold} />
      {/* tranche crantée : cylindre ouvert à facettes plates */}
      <mesh geometry={g.knurl} material={goldFlat} />
      {/* biseaux haut/bas + listel intérieur */}
      {[0.09, -0.09].map((y) => (
        <mesh key={y} position={[0, y, 0]} geometry={g.bevel} rotation={[Math.PI / 2, 0, 0]} material={gold} />
      ))}
      {[0.096, -0.096].map((y) => (
        <mesh key={`ring${y}`} position={[0, y, 0]} geometry={g.ring} rotation={[Math.PI / 2, 0, 0]} material={relief} />
      ))}
      {/* frappe $ en relief — face avant, puis copie retournée face arrière */}
      <group>
        <mesh geometry={g.arcTop} material={relief} />
        <mesh geometry={g.arcBot} material={relief} />
        <mesh geometry={g.bar} position={[0, 0.105, 0]} material={relief} />
      </group>
      <group rotation={[Math.PI, 0, 0]}>
        <mesh geometry={g.arcTop} material={relief} />
        <mesh geometry={g.arcBot} material={relief} />
        <mesh geometry={g.bar} position={[0, 0.105, 0]} material={relief} />
      </group>
    </group>
  );
}

function Arrow() {
  const geo = useMemo(() => {
    // pointe de flèche facettée (delta creusé), extrudée avec biseau
    const s = new THREE.Shape();
    s.moveTo(0, 1.05);
    s.lineTo(-0.72, -0.68);
    s.lineTo(0, -0.3);
    s.lineTo(0.72, -0.68);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.07,
      bevelSegments: 1,
      steps: 1,
    });
    g.center();
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#8a8f9c",
        metalness: 1,
        roughness: 0.3,
        envMapIntensity: 2.0,
        flatShading: true,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
      }),
    []
  );
  const edge = useGoldMat(true);
  return (
    <group rotation={[-0.32, 0, 0.16]}>
      <mesh geometry={geo} material={mat} />
      {/* arête dorée : même delta réduit, glissé derrière — liseré d'or */}
      <mesh geometry={geo} material={edge} position={[0, -0.02, -0.05]} scale={[1.07, 1.07, 0.62]} />
    </group>
  );
}

/* la gemme des pépites a été retirée le 20/07 à la demande de Teo — les
   pépites n'ont pas de totem */
const BODIES: Record<TotemKind, () => React.JSX.Element> = {
  coin: Coin,
  arrow: Arrow,
};

/* ——— scène d'un totem : lumière studio + animation ——— */

function TotemScene({ kind, shown }: { kind: TotemKind; shown: boolean }) {
  const spin = useRef<THREE.Group>(null); // rotation continue Y
  const tilt = useRef<THREE.Group>(null); // parallaxe + respiration
  const acc = useRef(0); // accumulateur de rotation continue
  const entry = useRef({ s: 0.55, r: -1.1, done: false });
  const invalidate = useThree((s) => s.invalidate);
  const Body = BODIES[kind];

  // reduced-motion : on pose un bel angle et on demande UNE frame
  useEffect(() => {
    if (store.reduced && spin.current && tilt.current) {
      spin.current.rotation.y = kind === "coin" ? 0.55 : 0.35;
      tilt.current.rotation.x = 0.12;
      entry.current = { s: 1, r: 0, done: true };
      spin.current.scale.setScalar(1);
      invalidate();
    }
  }, [kind, invalidate]);

  useFrame((state, dt) => {
    if (store.reduced || !spin.current || !tilt.current) return;
    const d = Math.min(dt, 1 / 30);
    const t = state.clock.elapsedTime;

    // entrée : matérialisation scale + rotation d'arrivée, une fois
    const e = entry.current;
    if (shown && !e.done) {
      e.s = damp(e.s, 1, 3.2, d);
      e.r = damp(e.r, 0, 3.2, d);
      if (1 - e.s < 0.002) {
        e.s = 1;
        e.r = 0;
        e.done = true;
      }
    }
    spin.current.scale.setScalar(e.s);

    // rotation continue ~10 s/tour + boost scroll amorti
    store.boost = damp(store.boost, 0, 1.6, d);
    acc.current += d * ((Math.PI * 2) / 10) * (1 + store.boost);
    spin.current.rotation.y = acc.current + e.r;

    // respiration + parallaxe souris (coupée sur écrans tactiles)
    const mx = store.coarse ? 0 : store.py * 0.14;
    const mz = store.coarse ? 0 : store.px * 0.1;
    tilt.current.rotation.x = damp(tilt.current.rotation.x, Math.sin(t * 0.45) * 0.055 + mx, 4, d);
    tilt.current.rotation.z = damp(tilt.current.rotation.z, mz, 4, d);
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={35} position={[0, 0, 4.3]} />
      <ambientLight intensity={0.45} />
      {/* rim chaude qui dessine les arêtes pendant la rotation + fill froid
          pour que les faces sombres gardent un modelé lisible sur le noir */}
      <directionalLight color="#ffb45e" position={[-3.2, 2.2, -3.5]} intensity={3} />
      <directionalLight color="#dfe6f5" position={[2.5, 3, 2.5]} intensity={1.1} />
      <group ref={tilt}>
        <group ref={spin}>
          <Body />
        </group>
      </group>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.3} scale={3.6} blur={2.6} far={2.2} resolution={256} color="#000000" />
      {/* studio sombre procédural : bandeaux lumineux qui GLISSENT sur les
          facettes pendant la rotation — c'est eux qui font la matière */}
      <Environment resolution={256} frames={1}>
        {/* fond de studio relevé : chaque facette garde un satiné de base,
            les bandeaux font les éclats qui glissent */}
        <color attach="background" args={["#1a1e28"]} />
        <Lightformer intensity={4} color="#fff2dc" position={[0, 3, -4]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 1.4, 1]} form="rect" />
        <Lightformer intensity={7} color={GOLD} position={[-4, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[3.2, 0.6, 1]} form="rect" />
        <Lightformer intensity={2.6} color="#cdd3e0" position={[4, -1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[2.6, 1.1, 1]} form="rect" />
        <Lightformer intensity={5} color={GOLD} position={[3, 2.5, -2.5]} rotation={[0, -Math.PI / 3, 0]} scale={[1.2, 2.8, 1]} form="rect" />
        <Lightformer intensity={3} color="#fff7e6" position={[-2.5, -2, -2]} rotation={[0, Math.PI / 3, 0]} scale={[1, 2.2, 1]} form="rect" />
        <Lightformer intensity={1.2} color="#ffffff" position={[0, -3.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[4, 4, 1]} form="circle" />
      </Environment>
    </>
  );
}

/* ——— slot : div traqué par le canvas partagé ——— */

export function SystemSlot({ kind }: { kind: TotemKind }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setShown(true);
        store.visible += e.isIntersecting ? 1 : -1;
        store.visible = Math.max(0, store.visible);
        store.bump();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className="absolute inset-0">
      <View className="h-full w-full">
        <TotemScene kind={kind} shown={shown} />
      </View>
    </div>
  );
}

/* ——— racine : canvas fixe unique + écouteurs globaux ——— */

export function SystemRoot() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    store.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    store.coarse = window.matchMedia("(pointer: coarse)").matches;

    const sync = () => setActive(store.visible > 0 && !store.reduced);
    store.subs.add(sync);
    sync();

    const onMove = (e: PointerEvent) => {
      store.px = (e.clientX / window.innerWidth) * 2 - 1;
      store.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const v = Math.abs(window.scrollY - lastY) / Math.max(16, now - lastT);
      store.boost = Math.min(2.2, store.boost + v * 0.55);
      lastY = window.scrollY;
      lastT = now;
    };
    if (!store.coarse) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      store.subs.delete(sync);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <Canvas
      className="pointer-events-none !fixed !inset-0 z-[1]"
      dpr={[1, store.coarse ? 1.25 : 1.5]}
      frameloop={active ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
    >
      <View.Port />
    </Canvas>
  );
}
