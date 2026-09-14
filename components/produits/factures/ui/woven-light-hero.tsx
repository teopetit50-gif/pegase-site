"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════════════
   Woven Light — composant 21st.dev, intégré le 09/09/2026.

   Repris tel quel dans son intention (particules échantillonnées sur un
   nœud torique, répulsion à la souris, retour élastique), avec quatre
   corrections et une adaptation, toutes nécessaires ici :

   1. PERFORMANCE. La boucle d'origine allouait quatre `THREE.Vector3` par
      particule et par image — 200 000 objets par image à 50 000
      particules, soit 12 millions d'allocations par seconde à 60 i/s. La
      boucle est réécrite en calcul scalaire, sans aucune allocation.
   2. FUITE. `animate()` n'était jamais annulé : le `requestAnimationFrame`
      survivait au démontage. On garde le handle et on l'annule.
   3. MOUVEMENT RÉDUIT. Rien n'écoutait `prefers-reduced-motion` : la scène
      est désormais peinte une fois, immobile, pour qui l'a demandé. Et
      l'animation se met en pause quand l'onglet passe en arrière-plan
      (voir la note sur le volet replié dans `components/Fond.tsx`).
   4. CADRE. Le composant se dimensionnait sur `window.innerWidth` : ici le
      fond vit dans un cadre `max-w-[1344px]`, pas dans la fenêtre. Il se
      mesure sur son conteneur, via `ResizeObserver`.

   ADAPTATION — la couleur. L'original tire une teinte au hasard par
   particule (`setHSL(Math.random(), .8, …)`), ce qui donne un arc-en-ciel.
   La référence et ce site sont monochromes : les particules n'ont qu'une
   variation de luminosité, qui donne la profondeur des brins.

   ── PASSAGE EN CLAIR (11/09/2026) : DE LA LUMIÈRE À L'ENCRE ──────────

   C'est LA pièce de la page qui ne pouvait pas simplement changer de
   couleur. Le mélange d'origine est `AdditiveBlending` : chaque particule
   AJOUTE de la lumière au pixel. Sur une page blanche, le pixel est déjà
   à son maximum — blanc + quoi que ce soit reste blanc. Repeint en foncé,
   le composant n'aurait RIEN dessiné, sans la moindre erreur.

   Il passe donc en `SubtractiveBlending` : le pixel devient
   `dst × (1 − src)`, c'est-à-dire que chaque particule RETIRE de la
   lumière au lieu d'en ajouter. La structure n'est plus de la lumière
   tissée dans le noir, c'est un dessin à l'encre sur une feuille — même
   nœud torique, mêmes brins, même répulsion à la souris.

   TROIS CONSÉQUENCES À NE PAS DÉFAIRE :

   1. LE FOND NE PEUT PLUS ÊTRE TRANSPARENT. En additif, le tampon partait
      de (0,0,0,0) et la couleur s'y accumulait ; le noir de la page se
      voyait à travers. En soustractif, `0 × (1 − src)` vaut 0 : sur un
      tampon transparent, RIEN ne se peindrait. Le rendu efface donc
      lui-même à la couleur du papier (`setClearColor(papier, 1)`), et
      cette couleur doit rester celle du fond derrière le canvas, sinon on
      voit le rectangle.
   2. `material.opacity` N'A PLUS AUCUN EFFET. Le facteur source du
      mélange vaut ZERO : seules les composantes RGB de la particule
      comptent, jamais son alpha. La densité du dessin se règle par la
      CLARTÉ DE L'ENCRE (`encre`), pas par une opacité — en baisser une
      qui ne sert plus est le genre de réglage qui fait perdre une heure.
   3. LE MÉLANGE RESTE COMMUTATIF (c'est une multiplication), donc
      `depthWrite: false` et l'absence de tri restent corrects.
   ══════════════════════════════════════════════════════════════════════ */

type WovenCanvasProps = {
  /** Nombre de particules. Réduit tout seul sur petit écran. */
  particules?: number;
  /** Distance de la caméra : plus petit = structure plus enveloppante. */
  distance?: number;
  /** L'encre. En mélange SOUSTRACTIF, c'est ce qui règle la densité du
   *  dessin : plus elle est claire, plus une particule assombrit le
   *  papier. #171717 retire au plus 9 % de lumière par particule. */
  encre?: string;
  /** Le papier : la couleur d'effacement du tampon. DOIT être celle du
   *  fond derrière le canvas, sinon son rectangle se voit. */
  papier?: string;
  /** Taille d'un point, en unités de scène. */
  taille?: number;
  className?: string;
};

export const WovenCanvas = ({
  particules = 54000,
  distance = 3.75,
  /* ⚠ Le sens est inversé par rapport à l'intuition : en mélange
     soustractif c'est la VALEUR de l'encre qui sert de quantité
     retirée, donc une encre plus CLAIRE donne un dessin plus DENSE.
     #232323 retire 14 % de lumière par particule.
     11/09 — monté un temps à #5a5a5a en croyant le nuage invisible :
     il l'était seulement parce que le navigateur restaurait la position
     de défilement après navigation et que la capture tombait dans le
     vide central du nœud. Vérifier `scrollY` avant de conclure qu'un
     décor ne se peint pas. Valeur relevée restaurée. */
  encre = "#232323",
  papier = "#ffffff",
  taille = 0.0075,
  className = "absolute inset-0 z-0",
}: WovenCanvasProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  /* Le nombre de particules dépend de la largeur. S'il était figé au
     montage, un téléphone passé en paysage gardait 45 % des particules
     sur un cadre deux fois plus large — visiblement clairsemé. On suit
     le seuil, et on ne recrée la géométrie qu'en le franchissant. */
  /* Le seuil est lu À L'INITIALISATION, pas dans un effet : un
     `setPetit()` posé dans le corps d'un effet déclenche un second rendu
     en cascade à chaque montage, et `react-hooks/set-state-in-effect` le
     refuse (lint en échec sur tout le dépôt). Aucun risque d'écart
     serveur/client ici : ce composant ne rend qu'un <div> vide, rien de
     ce qui est peint ne dépend de `petit` — il ne sert qu'au nombre de
     particules, décidé après le montage. L'effet se réduit donc à ce pour
     quoi les effets existent : l'abonnement. */
  const [petit, setPetit] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 699px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 699px)");
    const surChangement = (e: MediaQueryListEvent) => setPetit(e.matches);
    mq.addEventListener("change", surChangement);
    return () => mq.removeEventListener("change", surChangement);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const doux = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = distance;

    /* ── PAS DE WEBGL, PAS DE PANIQUE ────────────────────────────────
       `new THREE.WebGLRenderer()` LÈVE quand le contexte ne peut pas être
       créé : navigateur durci, GPU sur liste noire, onglet à court de
       mémoire, ou simplement `--disable-webgl` (c'est ce que passe
       outils/defile.mjs depuis le 11/09). Non rattrapée, l'exception part
       d'un effet React et emporte TOUT L'ARBRE : le visiteur reçoit la page
       d'erreur de Next à la place de la page produit. Constaté en recette,
       aux largeurs 1024 et 1440.

       Le repli est gratuit et il est bon : on ne monte rien, et le héros
       garde son papier et ses trois voiles. La page perd son dessin, pas
       son sens. (En monde sombre le même repli aurait donné un héros noir
       et vide — c'est le passage en clair qui rend la dégradation
       présentable.) */
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    /* Voir le point 1 de l'en-tête : en soustractif, un tampon transparent
       ne peut rien peindre. On efface à la couleur du papier. */
    renderer.setClearColor(new THREE.Color(papier), 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const dimensionner = () => {
      const l = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
      renderer.setSize(l, h, false);
    };
    dimensionner();

    /* Sur petit écran, moins de particules : la densité perçue est la même
       parce que la surface est quatre fois plus petite. */
    const nb = petit ? Math.round(particules * 0.45) : particules;

    const positions = new Float32Array(nb * 3);
    const origines = new Float32Array(nb * 3);
    const vitesses = new Float32Array(nb * 3);
    const couleurs = new Float32Array(nb * 3);

    const base = new THREE.Color(encre);

    /* Le composant d'origine échantillonnait les SOMMETS d'un
       `TorusKnotGeometry` avec `i % count` : à 220×32 sommets pour 46 000
       particules, chaque sommet était repris sept fois AU MÊME ENDROIT.
       D'où un nuage de gros points épars, jamais les brins tissés du
       rendu attendu.

       On échantillonne donc la COURBE elle-même, en continu : `brins`
       fils parallèles, chacun décalé d'un angle fixe autour du tube, et
       chacun peuplé de centaines de points le long du paramètre. C'est ce
       parallélisme qui donne les filaments. */
    const R = 1.5;
    const tube = 0.5;
    const P = 2;
    const Q = 3;

    const courbe = (u: number, out: [number, number, number]) => {
      const qp = (Q / P) * u;
      const cs = Math.cos(qp);
      const f = R * (2 + cs) * 0.5;
      out[0] = f * Math.cos(u);
      out[1] = f * Math.sin(u);
      out[2] = R * Math.sin(qp) * 0.5;
    };

    const brins = 190;
    const parBrin = Math.max(1, Math.floor(nb / brins));
    const p1: [number, number, number] = [0, 0, 0];
    const p2: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < nb; i++) {
      const brin = i % brins;
      const k = Math.floor(i / brins);
      const i3 = i * 3;

      /* Un léger décalage par brin évite que tous les fils démarrent au
         même endroit et produisent des moirés. */
      const u = ((k + (brin / brins) * 0.9) / parBrin) * Math.PI * 2 * P;
      courbe(u, p1);
      courbe(u + 0.01, p2);

      let tx = p2[0] - p1[0], ty = p2[1] - p1[1], tz = p2[2] - p1[2];
      let n = Math.hypot(tx, ty, tz) || 1;
      tx /= n; ty /= n; tz /= n;

      /* Repère de Frenet approché, comme le fait THREE lui-même :
         N pointe vers l'extérieur, B = T × N. */
      let nx = p1[0] + p2[0], ny = p1[1] + p2[1], nz = p1[2] + p2[2];
      let bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      n = Math.hypot(bx, by, bz) || 1;
      bx /= n; by /= n; bz /= n;
      nx = by * tz - bz * ty; ny = bz * tx - bx * tz; nz = bx * ty - by * tx;

      const v = (brin / brins) * Math.PI * 2;
      /* Presque tout à la surface du tube, un peu de matière dedans :
         c'est ce qui donne l'épaisseur sans brouiller les fils. */
      const r = tube * (0.82 + Math.random() * 0.18);
      const cv = Math.cos(v) * r;
      const sv = Math.sin(v) * r;

      const x = p1[0] + cv * nx + sv * bx;
      const y = p1[1] + cv * ny + sv * by;
      const z = p1[2] + cv * nz + sv * bz;

      positions[i3] = origines[i3] = x;
      positions[i3 + 1] = origines[i3 + 1] = y;
      positions[i3 + 2] = origines[i3 + 2] = z;

      /* Monochrome : seule la quantité d'encre varie, ce qui donne la
         profondeur des brins sans introduire de teinte. En soustractif,
         `l` élevé = particule qui retire PLUS de lumière, donc trait plus
         appuyé — la même variable, le sens opposé. */
      const l = 0.22 + Math.random() * 0.78;
      couleurs[i3] = base.r * l;
      couleurs[i3 + 1] = base.g * l;
      couleurs[i3 + 2] = base.b * l;
    }

    const geometrie = new THREE.BufferGeometry();
    geometrie.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometrie.setAttribute("color", new THREE.BufferAttribute(couleurs, 3));

    const materiau = new THREE.PointsMaterial({
      size: taille,
      vertexColors: true,
      /* `dst × (1 − src)` : la particule RETIRE de la lumière. Point 2 de
         l'en-tête — ne pas ajouter d'`opacity` ici, elle serait inerte. */
      blending: THREE.SubtractiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometrie, materiau);
    points.rotation.x = 0.62;
    scene.add(points);

    /* La souris est lue par rapport au cadre, pas à la fenêtre : le fond
       n'occupe pas toute la largeur de la page. */
    /* Au repos, le pointeur est placé HORS du cadre. L'original
       l'initialisait à (0,0) — soit le centre exact de la structure, qui
       se faisait donc repousser en permanence, même sans souris. */
    let mx = 99;
    let my = 99;
    const surSouris = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = -((e.clientY - r.top) / r.height) * 2 + 1;
    };

    /* `THREE.Clock` est déprécié dans cette version de three : on lit
       l'horloge du navigateur directement. */
    const t0 = performance.now();
    let raf = 0;

    /* Boucle sans allocation : tout est scalaire. */
    const pas = () => {
      const t = (performance.now() - t0) / 1000;
      const cx = mx * 3;
      const cy = my * 3;

      for (let i = 0; i < nb; i++) {
        const ix = i * 3;
        const iy = ix + 1;
        const iz = ix + 2;

        const px = positions[ix];
        const py = positions[iy];
        const pz = positions[iz];

        let vx = vitesses[ix];
        let vy = vitesses[iy];
        let vz = vitesses[iz];

        const dx = px - cx;
        const dy = py - cy;
        const dz = pz;
        const d2 = dx * dx + dy * dy + dz * dz;

        if (d2 < 2.25) {
          const d = Math.sqrt(d2) || 1e-6;
          const f = ((1.5 - d) * 0.01) / d;
          vx += dx * f;
          vy += dy * f;
          vz += dz * f;
        }

        vx = (vx + (origines[ix] - px) * 0.001) * 0.95;
        vy = (vy + (origines[iy] - py) * 0.001) * 0.95;
        vz = (vz + (origines[iz] - pz) * 0.001) * 0.95;

        positions[ix] = px + vx;
        positions[iy] = py + vy;
        positions[iz] = pz + vz;
        vitesses[ix] = vx;
        vitesses[iy] = vy;
        vitesses[iz] = vz;
      }

      geometrie.attributes.position.needsUpdate = true;
      points.rotation.y = t * 0.05;
      renderer.render(scene, camera);
    };

    const boucle = () => {
      pas();
      raf = requestAnimationFrame(boucle);
    };

    const visibilite = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !doux) {
        raf = requestAnimationFrame(boucle);
      }
    };

    if (doux) {
      renderer.render(scene, camera);
    } else {
      window.addEventListener("mousemove", surSouris);
      if (!document.hidden) raf = requestAnimationFrame(boucle);
    }

    const ro = new ResizeObserver(() => {
      dimensionner();
      if (doux) renderer.render(scene, camera);
    });
    ro.observe(mount);
    document.addEventListener("visibilitychange", visibilite);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", visibilite);
      window.removeEventListener("mousemove", surSouris);
      geometrie.dispose();
      materiau.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [petit, particules, distance, encre, papier, taille]);

  return <div ref={mountRef} className={className} />;
};

/* ── Le héros de démonstration livré avec le composant ────────────────
   Conservé tel quel pour référence. Le site n'en utilise que
   <WovenCanvas /> : voir components/Fond.tsx. */

export const WovenLightHero = () => {
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    textControls.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1 + 1.5, duration: 1.2, ease: [0.2, 0.65, 0.3, 0.9] },
    }));
    buttonControls.start({ opacity: 1, transition: { delay: 2.5, duration: 1 } });
  }, [textControls, buttonControls]);

  const titre = "Woven by Light";

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-white">
      <WovenCanvas />
      <div className="relative z-10 px-4 text-center">
        <h1 className="font-display text-6xl text-[#171717] md:text-8xl">
          {titre.split(" ").map((mot, i) => (
            <span key={i} className="inline-block">
              {mot.split("").map((c, j) => (
                <motion.span
                  key={j}
                  custom={i * 5 + j}
                  initial={{ opacity: 0, y: 50 }}
                  animate={textControls}
                  style={{ display: "inline-block" }}
                >
                  {c}
                </motion.span>
              ))}
              {i < titre.split(" ").length - 1 && <span>&nbsp;</span>}
            </span>
          ))}
        </h1>
        <motion.div initial={{ opacity: 0 }} animate={buttonControls} className="mt-10">
          <button className="rounded-full border-2 border-[#171717]/25 bg-[#171717]/[0.04] px-8 py-3 font-semibold text-[#171717] backdrop-blur-sm transition-all hover:bg-[#171717]/[0.08]">
            Explore the Weave
          </button>
        </motion.div>
      </div>
    </div>
  );
};
